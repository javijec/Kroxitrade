import {
  poeNinjaService,
  type PoeNinjaCurrencyData,
  type PoeNinjaUniqueDivinePrices
} from "../../services/poe-ninja";
import { translate } from "../../services/i18n";
import { tradeLocationService } from "../../services/trade-location";
import { settings } from "../../services/settings";
import { slugify } from "../../utilities/slugify";
import { normalizeValdoRewardName } from "../../utilities/normalize-valdo-reward-name";
import { emitPageDebug } from "../../utilities/page-debug";
import { getCurrencyIconUrl } from "../../data/currency-icons";
import { MAGEBLOOD_LEGACY_TEXTS } from "../../data/mageblood-legacy-texts";
import coeButtonImage from "../../../assets/coe-button.webp?inline";
import { copyItemForPob } from "../../utilities/copy-item-for-pob";
import {
  buildCraftOfExileText,
  copyTextSynchronously,
  hasUnsupportedCraftOfExileMod
} from "../../utilities/copy-item-for-craft-of-exile";
import { flashMessages } from "../../services/flash";
import { experimentalSettings } from "../../services/experimental";
import { pinnedItemsService } from "../../services/pinned-items";
import { isNativeChineseTradeSite } from "../../config/trade-hosts";
import { tradeDomObserver } from "../../core/trade-dom-observer";
import {
  itemIcon,
  itemLevelField,
  itemRendered,
  itemResultRows,
  modValueSpan,
  resultsContainer,
  socket
} from "../../site-adapter/selectors/common";
import { copyButton } from "../../site-adapter/selectors/poe2";
import {
  MAGEBLOOD_DUPLICATE_FIELD,
  MAGEBLOOD_DUPLICATE_PATTERN,
  MAGEBLOOD_EXPLANATIONS_CLASS,
  MAGEBLOOD_LEGACY_CLASS,
  MAGEBLOOD_LEGACY_EFFECTS,
  MAGEBLOOD_LEGACY_FIELD_PATTERN,
  MAGEBLOOD_LEGACY_PATTERN,
  MAGEBLOOD_LEGACY_VARIANTS,
  type MagebloodLegacy,
  formatMagebloodLegacyLine,
  getMagebloodLegacyBaseLabel,
  getMagebloodLegacyEffectLabel,
  getMagebloodLegacyLocale,
  normalizeMagebloodLegacyKey,
  titleCaseLegacyName
} from "./mageblood-legacy";
import { CHAOS_SLUG, extractPriceInfo, referenceSlugs, resolveCurrencySlug } from "./price-info";
import { extractValdoRewardName } from "./valdo-reward";
import pinIcon from "lucide-static/icons/pin.svg?raw";
import pinOffIcon from "lucide-static/icons/pin-off.svg?raw";



enum ItemResultsType {
  ARMOR = "armor",
  WEAPON = "weapon",
  UNKNOWN = "unknown"
}

const ILVL_THRESHOLDS = [
  { maxSockets: 2, ilvl: 1 },
  { maxSockets: 3, ilvl: 24 },
  { maxSockets: 4, ilvl: 34 },
  { maxSockets: 5, ilvl: 49 },
];

const isEnglishTradeHost = () => {
  const host = window.location.hostname.toLowerCase();
  return host === "www.pathofexile.com" || host === "pathofexile.com";
};



export class ItemResultsService {
  private currencyData: PoeNinjaCurrencyData | null = null;
  private valdoUniqueDivinePrices: PoeNinjaUniqueDivinePrices | null = null;
  private valdoPriceRequest: Promise<void> | null = null;
  private showEquivalentPricing = false;
  private showValdoRewardPricing = false;
  private showMagebloodLegacyDescriptions = false;
  private showPinnedItems = false;
  private unsubscribeSettings: (() => void) | null = null;
  private unsubscribeLocation: (() => void) | null = null;
  private readonly postSearchRefreshDelays = [80, 220, 500, 900];
  private searchRefreshTimers: number[] = [];
  private readonly handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    const clickedCopyButton = target?.closest<HTMLButtonElement>(copyButton);
    const coeButton = target?.closest<HTMLButtonElement>("button.bt-copy-coe");
    const wikiButton = target?.closest<HTMLButtonElement>("button.bt-open-wiki");
    const poedbButton = target?.closest<HTMLButtonElement>("button.bt-open-poedb");

    if (poedbButton && experimentalSettings.isWikiVisible() && isEnglishTradeHost()) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const url = poedbButton.dataset.poedbUrl;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return;
    }

    if (wikiButton && experimentalSettings.isWikiVisible() && isEnglishTradeHost()) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const url = wikiButton.dataset.wikiUrl;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return;
    }

    if (
      coeButton &&
      experimentalSettings.isCoeVisible()
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (coeButton.getAttribute("aria-disabled") === "true") return;

      const row = coeButton.closest<HTMLElement>(".row, .result-item");
      const text = row
        ? buildCraftOfExileText(row, experimentalSettings.isCoeDesecratedModsEnabled())
        : null;
      if (text && copyTextSynchronously(text)) {
        this.showCopyFeedback("Item copied for Craft of Exile.");
      } else {
        flashMessages.alert("Could not copy this item for Craft of Exile.");
      }
      return;
    }

    if (
      clickedCopyButton &&
      tradeLocationService.current.version === "2" &&
      experimentalSettings.isPoe2CopyVisible()
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const row = clickedCopyButton.closest<HTMLElement>(".row, .result-item");
      if (row && copyItemForPob(row)) {
        this.showCopyFeedback("Item text copied.");
      } else {
        flashMessages.alert("Could not copy this item for Path of Building.");
      }
      return;
    }

    if (!target?.closest(".btn.search-btn")) return;
    this.schedulePostSearchRefresh();
  };
  private readonly handleExperimentalChange = () => {
    this.enhanceResults();
  };

  async initialize() {
    emitPageDebug("item-results-initialize", {
      href: window.location.href
    });
    if (window.location.protocol === "chrome-extension:") {
      return;
    }

    await settings.load();
    this.showEquivalentPricing = settings.getCurrent().showEquivalentPricing;
    this.showValdoRewardPricing =
      settings.getCurrent().showValdoRewardPricing && !isNativeChineseTradeSite();
    this.showMagebloodLegacyDescriptions = settings.getCurrent().showMagebloodLegacyDescriptions;
    this.showPinnedItems = settings.getCurrent().showPinnedItems;
    this.unsubscribeSettings?.();
    this.unsubscribeSettings = settings.subscribe((value) => {
      const changed = this.showEquivalentPricing !== value.showEquivalentPricing;
      const nextValdoRewardPricing =
        value.showValdoRewardPricing && !isNativeChineseTradeSite();
      const valdoChanged = this.showValdoRewardPricing !== nextValdoRewardPricing;
      const magebloodChanged =
        this.showMagebloodLegacyDescriptions !== value.showMagebloodLegacyDescriptions;
      const pinsChanged = this.showPinnedItems !== value.showPinnedItems;
      this.showEquivalentPricing = value.showEquivalentPricing;
      this.showValdoRewardPricing = nextValdoRewardPricing;
      this.showMagebloodLegacyDescriptions = value.showMagebloodLegacyDescriptions;
      this.showPinnedItems = value.showPinnedItems;
      if (changed) {
        this.refreshEquivalentPricing();
      }
      if (valdoChanged) {
        if (this.showValdoRewardPricing) {
          void this.fetchValdoRewardPrices().then(() => {
            this.refreshValdoRewardPricing();
            this.schedulePostSearchRefresh();
          });
        } else {
          this.refreshValdoRewardPricing();
        }
      }
      if (magebloodChanged) {
        this.refreshMagebloodLegacyDescriptions();
      }
      if (pinsChanged) {
        this.refreshPinButtons();
      }
    });
    this.unsubscribeLocation?.();
    this.unsubscribeLocation = tradeLocationService.onChange(() => {
      void this.handleLocationChange();
    });
    
    try {
      await this.fetchRatios();
    } catch (e) {
      console.error("[Poe Trade Plus] Failed to fetch ratios from poe.ninja:", e);
    }

    this.startObserving();
    document.removeEventListener("click", this.handleDocumentClick, true);
    document.addEventListener("click", this.handleDocumentClick, true);
    document.removeEventListener(
      "poe-trade-plus:experimental-change",
      this.handleExperimentalChange
    );
    document.addEventListener(
      "poe-trade-plus:experimental-change",
      this.handleExperimentalChange
    );
  }

  private showCopyFeedback(toastMessage: string) {
    this.showItemCopiedToast(toastMessage);
  }

  private showItemCopiedToast(message: string) {
    document.querySelector(".poe-toast-trade.bt-item-copied-toast")?.remove();

    let container = document.body.querySelector<HTMLElement>(
      ".poe-toast-container.poe-toast-container--position-bottom-center"
    );
    if (!container) {
      container = document.createElement("div");
      container.className =
        "poe-toast-container poe-toast-container--position-bottom-center bt-item-copied-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className =
      "poe-toast-trade poe-toast-trade--type-success bt-item-copied-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    const content = document.createElement("div");
    content.className = "poe-toast-trade__content";

    const title = document.createElement("div");
    title.className = "poe-toast-trade__title";
    title.textContent = message;
    content.appendChild(title);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "poe-toast-trade__close";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", () => {
      toast.remove();
      if (
        container?.classList.contains("bt-item-copied-toast-container") &&
        container.childElementCount === 0
      ) {
        container.remove();
      }
    });

    toast.append(content, close);
    container.appendChild(toast);

    window.setTimeout(() => {
      toast.classList.add("is-leaving");
      window.setTimeout(() => {
        toast.remove();
        if (
          container?.classList.contains("bt-item-copied-toast-container") &&
          container.childElementCount === 0
        ) {
          container.remove();
        }
      }, 180);
    }, 1500);
  }

  private async handleLocationChange() {
    pinnedItemsService.clear();
    this.valdoUniqueDivinePrices = null;
    this.valdoPriceRequest = null;

    try {
      await this.fetchRatios();
    } catch (e) {
      console.error("[Poe Trade Plus] Failed to refresh ratios after location change:", e);
    }

    this.schedulePostSearchRefresh();
    this.refreshEquivalentPricing();
  }



  private async fetchRatios(forceFresh = false) {
    const { league, type, slug, version } = tradeLocationService.current;

    if (!league) {
      this.currencyData = null;
      this.valdoUniqueDivinePrices = null;
      emitPageDebug("poe-ninja-skip", {
        reason: "missing-league",
        league,
        type,
        slug
      });
      return;
    }

    emitPageDebug("poe-ninja-fetching-for-league", {
      league,
      type,
      slug,
      forceFresh
    });
    this.currencyData = forceFresh
      ? await poeNinjaService.fetchFreshCurrencyDataFor(league, version)
      : await poeNinjaService.fetchCurrencyDataFor(league, version);

    if (this.showValdoRewardPricing && version === "1") {
      await this.fetchValdoRewardPrices();
    }
  }

  async forceRefreshEquivalentPricing() {
    await this.fetchRatios(true);
    this.refreshEquivalentPricing();
  }

  private async fetchValdoRewardPrices() {
    if (tradeLocationService.current.version !== "1" || !tradeLocationService.current.league) {
      this.valdoUniqueDivinePrices = null;
      return;
    }
    if (this.valdoUniqueDivinePrices) return;
    if (this.valdoPriceRequest) return this.valdoPriceRequest;

    const { league } = tradeLocationService.current;
    const request = poeNinjaService
      .fetchUniqueDivinePricesFor(league)
      .then((prices) => {
        if (tradeLocationService.current.version === "1" && tradeLocationService.current.league === league) {
          this.valdoUniqueDivinePrices = prices;
        }
      })
      .catch((error) => {
        console.error("[Poe Trade Plus] Failed to fetch Valdo reward prices from poe.ninja:", error);
        if (tradeLocationService.current.version === "1" && tradeLocationService.current.league === league) {
          this.valdoUniqueDivinePrices = null;
        }
      })
      .finally(() => {
        if (this.valdoPriceRequest === request) {
          this.valdoPriceRequest = null;
        }
      });
    this.valdoPriceRequest = request;
    return request;
  }

  private injectEquivalentPricing(row: HTMLElement) {
    const priceInfo = extractPriceInfo(row);
    if (!priceInfo) {
      return;
    }

    const { container: priceContainer, amount, currencyText } = priceInfo;

    if (!this.currencyData) {
      this.removeEquivalentPricing(row);
      return;
    }

    if (!currencyText || isNaN(amount)) {
      this.removeEquivalentPricing(row);
      emitPageDebug("equivalent-missing-details", {
        currency: currencyText,
        amount,
        text: priceContainer.textContent?.trim() || "",
        className: priceContainer.className
      });
      return;
    }

    const slug = resolveCurrencySlug(currencyText);
    const pricedCurrency = this.currencyData[slug];
    if (!pricedCurrency) {
      this.removeEquivalentPricing(row);
      emitPageDebug("equivalent-unresolved", {
        amount,
        currencyText,
        slug,
        availableSample: Object.keys(this.currencyData).slice(0, 10)
      });
      return;
    }

    const version = tradeLocationService.current.version;
    const valueInPrimary = amount * pricedCurrency.value;
    const parts = referenceSlugs[version]
      .filter((referenceSlug) => referenceSlug !== slug)
      .flatMap((referenceSlug) => {
        const reference = this.currencyData?.[referenceSlug];
        if (!reference?.value) return [];

        const equivalent = valueInPrimary / reference.value;
        const rounded = equivalent >= 10
          ? Math.round(equivalent)
          : Math.round(equivalent * 10) / 10;
        if (!rounded) return [];

        return [{ amount: rounded, slug: referenceSlug, icon: reference.icon }];
      });

    if (parts.length === 0) {
      this.removeEquivalentPricing(row);
      return;
    }

    emitPageDebug("equivalent-rendered", {
      amount,
      currencyText,
      slug,
      parts
    });
    this.renderEquivalentPricing(priceContainer, parts);
  }

  private renderEquivalentPricing(
    container: HTMLElement,
    parts: Array<{ amount: number | string; slug: string; icon: string }>
  ) {
    let el = container.querySelector(".bt-equivalent-pricings-equivalent") as HTMLElement | null;
    if (!el) {
      el = document.createElement("span");
      el.className = "bt-equivalent-pricings bt-equivalent-pricings-equivalent";
      container.appendChild(el);
    }

    el.replaceChildren();
    el.appendChild(this.createTextSpan("bt-equivalent-label", "equivalent:"));

    parts.forEach((part, index) => {
      if (index > 0) {
        el!.appendChild(this.createTextSpan("bt-equivalent-separator", "="));
      }
      el!.appendChild(this.createCurrencyFragment(part.amount, part.slug, part.icon));
    });
    this.syncEquivalentVisibility(el!);
  }

  private createCurrencyFragment(amount: number | string, slug: string, iconUrl: string) {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this.createTextSpan("bt-equivalent-amount", String(amount)));

    const icon = document.createElement("img");
    icon.className = "bt-equivalent-icon currency-icon";
    icon.alt = slug;
    icon.src = iconUrl || getCurrencyIconUrl(slug === CHAOS_SLUG ? "chaos" : "divine");
    fragment.appendChild(icon);

    return fragment;
  }

  private createTextSpan(className: string, text: string) {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = text;
    return span;
  }

  private removeEquivalentPricing(row: HTMLElement) {
    row.querySelectorAll(".bt-equivalent-pricings-equivalent").forEach((el) => el.remove());
  }

  private injectValdoRewardPricing(row: HTMLElement) {
    if (!this.showValdoRewardPricing || tradeLocationService.current.version !== "1") {
      this.removeValdoRewardPricing(row);
      return;
    }

    const rewardName = extractValdoRewardName(row);
    const priceInfo = extractPriceInfo(row);
    if (!rewardName || !priceInfo || !this.valdoUniqueDivinePrices || !this.currencyData) {
      this.removeValdoRewardPricing(row);
      return;
    }

    const rewardValue = this.valdoUniqueDivinePrices[slugify(normalizeValdoRewardName(rewardName))];
    const divineValue = this.currencyData["divine-orb"]?.value;
    const priceCurrency = this.currencyData[resolveCurrencySlug(priceInfo.currencyText)]?.value;
    if (rewardValue === undefined || !divineValue || !priceCurrency || !Number.isFinite(priceInfo.amount)) {
      this.removeValdoRewardPricing(row);
      return;
    }

    const mapCostInDivines = (priceInfo.amount * priceCurrency) / divineValue;
    this.renderValdoRewardPricing(priceInfo.container, rewardValue, rewardValue - mapCostInDivines);
  }

  private renderValdoRewardPricing(container: HTMLElement, rewardValue: number, profit: number) {
    let element = container.querySelector<HTMLElement>(".bt-valdo-reward-pricing");
    if (!element) {
      element = document.createElement("span");
      element.className = "bt-equivalent-pricings bt-valdo-reward-pricing";
      container.appendChild(element);
    }
    const language = settings.getCurrent().language;
    const format = (value: number) => Math.round(value * 10) / 10;
    const formattedProfit = format(profit);
    const divineIcon = this.currencyData?.["divine-orb"]?.icon || getCurrencyIconUrl("divine");
    element.replaceChildren(
      this.createTextSpan("bt-valdo-reward-label", `${translate(language, "results.valdoReward")} `),
      this.createCurrencyFragment(format(rewardValue), "divine-orb", divineIcon),
      this.createTextSpan(
        `bt-valdo-profit ${formattedProfit >= 0 ? "is-positive" : "is-negative"}`,
        ` ${translate(language, "results.valdoProfit")} `
      ),
      this.createCurrencyFragment(
        `${formattedProfit >= 0 ? "+" : ""}${formattedProfit}`,
        "divine-orb",
        divineIcon
      )
    );
  }

  private removeValdoRewardPricing(row: HTMLElement) {
    row.querySelectorAll(".bt-valdo-reward-pricing").forEach((element) => element.remove());
  }

  private syncEquivalentVisibility(element: HTMLElement) {
    const isHidden = !this.showEquivalentPricing;
    element.classList.toggle("is-hidden", isHidden);
    element.toggleAttribute("hidden", isHidden);
    element.style.display = isHidden ? "none" : "block";
    element.setAttribute("aria-hidden", String(isHidden));
  }

  private unsubscribeObserver: (() => void) | null = null;

  private startObserving() {
    this.unsubscribeObserver?.();
    this.unsubscribeObserver = tradeDomObserver.subscribe({
      id: "item-results",
      selector: resultsContainer,
      debounceMs: 100,
      handler: () => this.enhanceResults()
    });
  }

  private schedulePostSearchRefresh() {
    this.searchRefreshTimers.forEach((timer) => window.clearTimeout(timer));
    this.searchRefreshTimers = this.postSearchRefreshDelays.map((delay) =>
      window.setTimeout(() => this.enhanceResults(), delay)
    );
  }

  private enhanceResults() {
    // Current trade site uses .result-item, but some pages or versions use .row.
    // Re-run equivalent pricing on every visible result because the trade site can recycle DOM nodes between searches.
    const results = document.querySelectorAll(itemResultRows);
    results.forEach((row: Element) => {
      const typedRow = row as HTMLElement;
      this.enablePoe2CopyButton(typedRow);
      this.syncCoeButton(typedRow);
      this.syncWikiButton(typedRow);
      this.syncPoedbButton(typedRow);
      this.injectEquivalentPricing(typedRow);
      this.injectValdoRewardPricing(typedRow);
       this.enhanceMagebloodLegacy(typedRow);
       this.syncPinButton(typedRow);
      if (typedRow.hasAttribute("bt-enhanced")) {
        return;
      }

      typedRow.setAttribute("bt-enhanced", "true");
      this.checkMaximumSockets(typedRow);
    });
  }

  private enablePoe2CopyButton(row: HTMLElement) {
    if (tradeLocationService.current.version !== "2") return;

    const rowCopyButton = row.querySelector<HTMLButtonElement>(copyButton);
    if (!rowCopyButton) return;

    experimentalSettings.applyPoe2CopyButton(rowCopyButton);
  }

  private syncCoeButton(row: HTMLElement) {
    const left = row.querySelector<HTMLElement>(".left");
    if (!left) return;

    const searchByButton = left.querySelector<HTMLButtonElement>("button.searchBy");
    let button = left.querySelector<HTMLButtonElement>("button.bt-copy-coe");
    if (!experimentalSettings.isCoeVisible()) {
      button?.remove();
      return;
    }

    if (button) {
      this.syncCoeButtonUnsupportedState(button, row);
      if (searchByButton) this.positionCoeButton(button, searchByButton);
      return;
    }

    button = document.createElement("button");
    button.type = "button";
    button.className = "bt-copy-coe";
    button.setAttribute("aria-label", "Copy for Craft of Exile");
    this.syncCoeButtonUnsupportedState(button, row);
    
    const image = document.createElement("img");
    image.src = coeButtonImage;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    button.appendChild(image);
    if (searchByButton) {
      searchByButton.insertAdjacentElement("afterend", button);
      this.positionCoeButton(button, searchByButton);
    } else {
      left.appendChild(button);
    }
  }

  private syncPinButton(row: HTMLElement) {
    const existingButton = row.querySelector<HTMLButtonElement>("button.bt-pin-button");
    if (!this.showPinnedItems) {
      existingButton?.remove();
      row.classList.remove("bt-pinned");
      row.removeAttribute("data-bt-pin-id");
      return;
    }

    const left = row.querySelector<HTMLElement>(".left");
    const id = row.dataset.id;
    if (!left || !id) return;
    let button = existingButton;
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "bt-pin-button";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const currentId = row.dataset.id;
        console.debug("[Poe Trade Plus] Pin clicked", {
          currentId,
          rowConnected: row.isConnected
        });
        if (!currentId) {
          console.debug("[Poe Trade Plus] Pin ignored: result has no id");
          return;
        }
        const title = row.querySelector<HTMLElement>(".itemName .itemHeader, .item-popup__header-line")?.textContent?.trim() || "Item";
        pinnedItemsService.toggle({
          id: currentId,
          title,
          detailsHtml: row.querySelector<HTMLElement>(".itemPopupContainer, .item-popup")?.outerHTML || "",
          renderedHtml: row.querySelector<HTMLElement>(".item")?.outerHTML || "",
          pricingHtml: row.querySelector<HTMLElement>("[data-field=price], .price")?.outerHTML || ""
        });
        console.debug("[Poe Trade Plus] Pin toggled", { currentId });
        this.syncPinButton(row);
      }, true);
      left.appendChild(button);
    }
    const pinned = pinnedItemsService.has(id);
    row.classList.toggle("bt-pinned", pinned);
    const label = pinned ? "Unpin" : "Pin";
    button.innerHTML = pinned ? pinOffIcon : pinIcon;
    button.title = label;
    button.setAttribute("aria-label", label);
    row.dataset.btPinId = id;
  }

  private refreshPinButtons() {
    document
      .querySelectorAll<HTMLElement>(itemResultRows)
      .forEach((row) => this.syncPinButton(row));
  }

  private syncWikiButton(row: HTMLElement) {
    const left = row.querySelector<HTMLElement>(".left");
    if (!left) return;

    const existingButton = left.querySelector<HTMLButtonElement>("button.bt-open-wiki");
    const searchByButton = left.querySelector<HTMLButtonElement>("button.searchBy");
    const wikiUrl = experimentalSettings.isWikiVisible() && isEnglishTradeHost()
      ? this.getItemWikiUrl(row)
      : null;

    if (!wikiUrl) {
      existingButton?.remove();
      return;
    }

    let button = existingButton;
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "bt-open-wiki";
      button.setAttribute("aria-label", "Open item wiki");
      button.textContent = "W";
    }

    button.dataset.wikiUrl = wikiUrl;
    button.title = "Open item wiki";

    if (searchByButton) {
      const coeButton = left.querySelector<HTMLButtonElement>("button.bt-copy-coe");
      if (!button.isConnected) {
        (coeButton || searchByButton).insertAdjacentElement("afterend", button);
      }
      this.positionResultActionButton(button, searchByButton, coeButton ? 1 : 0);
    } else if (!button.isConnected) {
      left.appendChild(button);
    }
  }

  private syncPoedbButton(row: HTMLElement) {
    const left = row.querySelector<HTMLElement>(".left")
    if (!left) return

    const existingButton = left.querySelector<HTMLButtonElement>("button.bt-open-poedb")
    const searchByButton = left.querySelector<HTMLButtonElement>("button.searchBy")
    const poedbUrl = experimentalSettings.isWikiVisible() && isEnglishTradeHost()
      ? this.getItemPoedbUrl(row)
      : null

    if (!poedbUrl) {
      existingButton?.remove()
      return
    }
    let button = existingButton
    if (!button) {
      button = document.createElement("button")
      button.type = "button"
      button.className = "bt-open-poedb"
      button.setAttribute("aria-label", "PoeDB")
      button.textContent = "P"
    }

    button.dataset.poedbUrl = poedbUrl
    button.title = "PoeDB"

    if (searchByButton) {
      const coeButton = left.querySelector<HTMLButtonElement>("button.bt-copy-coe")
      const wikiButton = left.querySelector<HTMLButtonElement>("button.bt-open-wiki")
      const index = (coeButton ? 1 : 0) + (wikiButton ? 1 : 0)
      if (!button.isConnected) {
        ;(wikiButton || coeButton || searchByButton).insertAdjacentElement("afterend", button)
      }
      this.positionResultActionButton(button, searchByButton, index)
    } else if (!button.isConnected) {
      left.appendChild(button)
    }
  }

  private getItemPoedbUrl(row: HTMLElement) {
    const name = this.getExternalItemName(row)
    if (!name || tradeLocationService.current.version !== "1") return null

    const pageName = encodeURIComponent(
      name.replace(/['’]/g, "").replace(/\s+/g, "_")
    )
    return `https://poedb.tw/us/${pageName}`
  }

  private getItemWikiUrl(row: HTMLElement) {
    const name = this.getExternalItemName(row)
    if (!name) return null

    const baseUrl = tradeLocationService.current.version === "2"
      ? "https://www.poe2wiki.net/wiki/"
      : "https://www.poewiki.net/wiki/"
    const pageName = encodeURIComponent(name.replace(/\s+/g, "_")).replace(/'/g, "%27")
    return `${baseUrl}${pageName}`
  }

  private getExternalItemName(row: HTMLElement) {
    const header = row.querySelector<HTMLElement>(
      ".item-popup__header--unique, .item-popup__header--gem"
    )
    const name = header
      ?.querySelector<HTMLElement>(".item-popup__header-line")
      ?.textContent
      ?.trim();

    if (!name) return null;
    return name
  }

  private syncCoeButtonUnsupportedState(button: HTMLButtonElement, row: HTMLElement) {
    const unsupported = hasUnsupportedCraftOfExileMod(row);
    button.classList.toggle("bt-copy-coe--disabled", unsupported);
    button.setAttribute("aria-disabled", unsupported ? "true" : "false");
    button.title = unsupported
      ? "Craft of Exile can't import this item yet (Prefix/Suffix Modifier mods)."
      : "Copy for Craft of Exile";
  }

  private positionCoeButton(button: HTMLButtonElement, searchByButton: HTMLButtonElement) {
    this.positionResultActionButton(button, searchByButton, 0);
  }

  private positionResultActionButton(button: HTMLButtonElement, searchByButton: HTMLButtonElement, index: number) {
    const searchStyle = window.getComputedStyle(searchByButton);
    const searchLeft = Number.parseFloat(searchStyle.left);
    const searchWidth = Number.parseFloat(searchStyle.width);

    if (Number.isFinite(searchLeft) && Number.isFinite(searchWidth)) {
      button.style.left = `${searchLeft + searchWidth + (index * 30)}px`;
    }

    if (searchStyle.bottom !== "auto") {
      button.style.top = "auto";
      button.style.bottom = searchStyle.bottom;
    } else if (searchStyle.top !== "auto") {
      button.style.top = searchStyle.top;
      button.style.bottom = "auto";
    }
  }

  private refreshEquivalentPricing() {
    const results = document.querySelectorAll(itemResultRows);
    results.forEach((row) => this.injectEquivalentPricing(row as HTMLElement));
  }

  private refreshValdoRewardPricing() {
    const results = document.querySelectorAll(itemResultRows);
    results.forEach((row) => this.injectValdoRewardPricing(row as HTMLElement));
  }

  private enhanceMagebloodLegacy(row: HTMLElement) {
    if (!this.showMagebloodLegacyDescriptions) {
      this.removeMagebloodLegacyDescriptions(row);
      return;
    }

    this.removeMagebloodLegacyDescriptions(row);

    const legacies: MagebloodLegacy[] = [];
    const duplicateMods: HTMLElement[] = [];
    let duplicatePercent = 0;

    row.querySelectorAll<HTMLElement>(modValueSpan).forEach((valueSpan) => {
      const inner = valueSpan.querySelector<HTMLElement>("span") || valueSpan;
      const text = (inner.textContent || "").replace(/\s+/g, " ").trim();
      const field = valueSpan.dataset.field || "";
      const mod = valueSpan.closest<HTMLElement>(".item-mod");

      const legacyFieldMatch = field.match(MAGEBLOOD_LEGACY_FIELD_PATTERN);
      if (legacyFieldMatch) {
        const key = MAGEBLOOD_LEGACY_VARIANTS[legacyFieldMatch[1]];
        if (mod && key) {
          legacies.push({ mod, key, title: text });
        }
        return;
      }

      const legacyMatch = text.match(MAGEBLOOD_LEGACY_PATTERN);
      if (legacyMatch) {
        if (mod) {
          const name = legacyMatch[1].trim();
          legacies.push({
            mod,
            key: normalizeMagebloodLegacyKey(name),
            title: text
          });
        }
        return;
      }

      const duplicateMatch = text.match(MAGEBLOOD_DUPLICATE_PATTERN);
      if (field === MAGEBLOOD_DUPLICATE_FIELD || duplicateMatch) {
        if (mod) duplicateMods.push(mod);
        const percentMatch = text.match(/(\d+)%/);
        duplicatePercent = Number.parseInt(
          percentMatch?.[1] || duplicateMatch?.[1] || duplicateMatch?.[2] || "0",
          10
        );
      }
    });

    if (legacies.length === 0) return;

    const counts: Record<string, number> = {};
    const displayTitles: Record<string, string> = {};
    legacies.forEach(({ key, title }) => {
      counts[key] = (counts[key] || 0) + 1;
      displayTitles[key] = title;
    });

    const duplicates = legacies.length - Object.keys(counts).length;
    const duplicateMod = duplicateMods[0] || null;
    const multiplier = duplicateMod && Number.isFinite(duplicatePercent)
      ? 1 + (duplicatePercent / 100) * duplicates
      : 1;
    const increasedEffect = Math.round((multiplier - 1) * 100);

    legacies.forEach(({ mod }) => mod.classList.add(MAGEBLOOD_LEGACY_CLASS));

    if (!row.querySelector(`.${MAGEBLOOD_EXPLANATIONS_CLASS}`)) {
      const explanationAnchor = this.findMagebloodExplanationAnchor(row, legacies);
      const fragment = document.createDocumentFragment();
      fragment.appendChild(
        this.buildMagebloodLegacyExplanations(counts, displayTitles, multiplier, increasedEffect)
      );

      explanationAnchor?.after(fragment);
    }
  }

  private removeMagebloodLegacyDescriptions(row: HTMLElement) {
    row
      .querySelectorAll(`.${MAGEBLOOD_EXPLANATIONS_CLASS}`)
      .forEach((element) => element.remove());
    row
      .querySelectorAll(`.${MAGEBLOOD_LEGACY_CLASS}`)
      .forEach((element) => element.classList.remove(MAGEBLOOD_LEGACY_CLASS));
  }

  private createMagebloodDiv(className: string, text?: string) {
    const el = document.createElement("div");
    el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  private findMagebloodExplanationAnchor(
    row: HTMLElement,
    legacies: MagebloodLegacy[]
  ) {
    const content = row.querySelector<HTMLElement>(".item-popup__content") || row;
    const flagsSeparator = content.querySelector<HTMLHRElement>('hr[name="flags"]');
    if (flagsSeparator) {
      return flagsSeparator;
    }

    const corruptedLine = Array.from(content.children).find((child) =>
      /\b(?:corrupted|corrupto)\b/i.test(child.textContent || "")
    );
    if (corruptedLine) {
      const next = corruptedLine.nextElementSibling;
      return next?.tagName.toLowerCase() === "hr"
        ? next
        : corruptedLine;
    }

    const explicitSeparator = content.querySelector<HTMLHRElement>('hr[name="explicit"]');
    if (explicitSeparator) {
      return explicitSeparator;
    }

    return legacies[legacies.length - 1]?.mod || content.lastElementChild;
  }

  private buildMagebloodLegacyExplanations(
    counts: Record<string, number>,
    displayTitles: Record<string, string>,
    multiplier: number,
    increasedEffect: number
  ) {
    const container = this.createMagebloodDiv(MAGEBLOOD_EXPLANATIONS_CLASS);
    const locale = getMagebloodLegacyLocale();
    const legacyTexts = MAGEBLOOD_LEGACY_TEXTS[locale] || MAGEBLOOD_LEGACY_TEXTS.en;
    const baseLabel = getMagebloodLegacyBaseLabel(locale);
    const effectLabel = getMagebloodLegacyEffectLabel(locale);

    Object.keys(counts).forEach((key) => {
      const titleText = displayTitles[key] || `Legacy of ${titleCaseLegacyName(key)}`;
      const effect = MAGEBLOOD_LEGACY_EFFECTS[key];
      const templates = legacyTexts[key] || MAGEBLOOD_LEGACY_TEXTS.en[key];
      const block = document.createElement("div");
      const title = document.createElement("span");
      title.style.color = "var(--colour-augmented)";
      title.textContent = titleText;
      block.appendChild(title);

      if (!effect || !templates) {
        block.appendChild(document.createElement("br"));
        block.appendChild(document.createTextNode("Effect not in the database yet."));
        container.appendChild(block);
        return;
      }

      effect.stats.forEach(([base], index) => {
        const template = templates[index] || MAGEBLOOD_LEGACY_TEXTS.en[key]?.[index];
        if (!template) return;

        const final = multiplier > 1.0001 ? Math.floor(base * multiplier) : base;
        const value = formatMagebloodLegacyLine(template, final);
        const line = document.createElement("span");
        line.className = "bt-mb-explanation-line";
        line.textContent = value;
        if (multiplier > 1.0001) {
          const detail = document.createElement("span");
          detail.className = "bt-mb-explanation-detail";
          detail.textContent = ` (${baseLabel}: ${base}, +${increasedEffect}% ${effectLabel})`;
          line.appendChild(detail);
        }
        block.appendChild(document.createElement("br"));
        block.appendChild(line);
      });

      templates.slice(effect.stats.length).forEach((line) => {
        block.appendChild(document.createElement("br"));
        block.appendChild(document.createTextNode(line));
      });

      container.appendChild(block);
    });

    return container;
  }

  private refreshMagebloodLegacyDescriptions() {
    const results = document.querySelectorAll(itemResultRows);
    results.forEach((row) => this.enhanceMagebloodLegacy(row as HTMLElement));
  }



  private checkMaximumSockets(row: HTMLElement) {
    if (tradeLocationService.current.version !== "1") return;

    const ilvlEl = row.querySelector(itemLevelField);
    const ilvlMatch = ilvlEl?.textContent?.match(/(\d+)/);
    if (!ilvlMatch) return;
    const ilvl = parseInt(ilvlMatch[0], 10);

    const socketsCount = row.querySelectorAll(socket).length;
    if (socketsCount === 0) return;

    const iconImg = row.querySelector(itemIcon) as HTMLImageElement;
    const iconSrc = iconImg?.src || "";
    let type = ItemResultsType.UNKNOWN;
    if (/\/BodyArmours\//.test(iconSrc)) type = ItemResultsType.ARMOR;
    else if (/\/OneHandWeapons\/|\/TwoHandWeapons\//.test(iconSrc)) type = ItemResultsType.WEAPON;

    if (type !== ItemResultsType.ARMOR) return;

    const threshold = ILVL_THRESHOLDS.find(t => ilvl <= t.ilvl);
    if (!threshold) return;

    if (threshold.maxSockets > socketsCount) {
        const rendered = row.querySelector(itemRendered);
        if (rendered) {
            const warning = document.createElement("div");
            warning.className = "bt-maximum-sockets-warning";
            warning.style.color = "#ff4444";
            warning.style.fontSize = "12px";
            warning.style.textAlign = "center";
            warning.style.padding = "4px";
            warning.style.background = "rgba(0,0,0,0.8)";
            warning.style.border = "1px solid #ff4444";
            warning.innerText = `⚠ Max sockets for ilvl ${ilvl} is ${threshold.maxSockets}`;
            rendered.prepend(warning);
        }
    }
  }


}

export const itemResultsService = new ItemResultsService();
