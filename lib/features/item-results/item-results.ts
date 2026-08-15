import {
  poeNinjaService,
  type PoeNinjaCurrencyData,
  type PoeNinjaUniqueDivinePrices
} from "../../services/poe-ninja.ts";
import { translate } from "../../services/i18n.ts";
import { tradeLocationService } from "../../services/trade-location.ts";
import { settings } from "../../services/settings.ts";
import { slugify } from "../../utilities/slugify.ts";
import { normalizeValdoRewardName } from "../../utilities/normalize-valdo-reward-name.ts";
import { emitPageDebug } from "../../utilities/page-debug.ts";
import { getCurrencyIconUrl } from "../../data/currency-icons.ts";
import { MAGEBLOOD_LEGACY_TEXTS } from "../../data/mageblood-legacy-texts.ts";
import coeButtonImage from "../../../assets/coe-button.webp?inline";
import { copyItemForPob } from "../../utilities/copy-item-for-pob.ts";
import {
  buildCraftOfExileText,
  copyTextSynchronously,
  hasUnsupportedCraftOfExileMod
} from "../../utilities/copy-item-for-craft-of-exile.ts";
import { flashMessages } from "../../services/flash.ts";
import { experimentalSettings } from "../../services/experimental.ts";
import { pinnedItemsService } from "../../services/pinned-items.ts";
import { isNativeChineseTradeSite } from "../../config/trade-hosts.ts";
import { extensionBus } from "../../core/extension-bus.ts";
import { tradeContext } from "../../core/trade-context.ts";
import { tradeDomObserver } from "../../core/trade-dom-observer.ts";
import {
  createFeatureLifecycle,
  type FeatureLifecycle
} from "../../core/feature-lifecycle.ts";
import {
  explicitSeparator,
  flagsSeparator,
  itemIcon,
  itemLevelField,
  itemPopupContent,
  itemPopupHeaderLine,
  itemPrice,
  itemRendered,
  itemTitleLine,
  modElement,
  modValueSpan,
  pinnedItemDetails,
  resultRowAncestor,
  resultsContainer,
  searchButton,
  socket,
  uniqueItemHeader
} from "../../site-adapter/selectors/common.ts";
import { tradeDom } from "../../site-adapter/trade-dom.ts";
import { copyButton } from "../../site-adapter/selectors/poe2.ts";
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
} from "./mageblood-legacy.ts";
import { CHAOS_SLUG, extractPriceInfo, referenceSlugs, resolveCurrencySlug } from "./price-info.ts";
import { extractValdoRewardName } from "./valdo-reward.ts";
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
  const { host } = tradeContext.get();
  return host === "www.pathofexile.com" || host === "pathofexile.com";
};

export interface ItemResultsFeature extends FeatureLifecycle {
  forceRefreshEquivalentPricing(): Promise<void>
}

export const createItemResults = (): ItemResultsFeature => {
  let currencyData: PoeNinjaCurrencyData | null = null;
  let valdoUniqueDivinePrices: PoeNinjaUniqueDivinePrices | null = null;
  let valdoPriceRequest: Promise<void> | null = null;
  let showEquivalentPricing = false;
  let showValdoRewardPricing = false;
  let showMagebloodLegacyDescriptions = false;
  let showPinnedItems = false;
  let unsubscribeSettings: (() => void) | null = null;
  let unsubscribeLocation: (() => void) | null = null;
  const postSearchRefreshDelays = [80, 220, 500, 900];
  let searchRefreshTimers: number[] = [];
  let unsubscribeObserver: (() => void) | null = null;
  let unsubscribeExperimental: (() => void) | null = null;

  const handleDocumentClick = (event: MouseEvent) => {
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

      const row = coeButton.closest<HTMLElement>(resultRowAncestor);
      const text = row
        ? buildCraftOfExileText(row, experimentalSettings.isCoeDesecratedModsEnabled())
        : null;
      if (text && copyTextSynchronously(text)) {
        showCopyFeedback("Item copied for Craft of Exile.");
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

      const row = clickedCopyButton.closest<HTMLElement>(resultRowAncestor);
      if (row && copyItemForPob(row)) {
        showCopyFeedback("Item text copied.");
      } else {
        flashMessages.alert("Could not copy this item for Path of Building.");
      }
      return;
    }

    if (!target?.closest(searchButton)) return;
    schedulePostSearchRefresh();
  };
  const handleExperimentalChange = () => {
    enhanceResults();
  };

  const showCopyFeedback = (toastMessage: string) => {
    showItemCopiedToast(toastMessage);
  };

  const showItemCopiedToast = (message: string) => {
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
  };

  const handleLocationChange = async () => {
    pinnedItemsService.clear();
    valdoUniqueDivinePrices = null;
    valdoPriceRequest = null;

    try {
      await fetchRatios();
    } catch (e) {
      console.error("[Poe Trade Plus] Failed to refresh ratios after location change:", e);
    }

    schedulePostSearchRefresh();
    refreshEquivalentPricing();
  };



  const fetchRatios = async (forceFresh = false) => {
    const { league, type, slug, version } = tradeLocationService.current;

    if (!league) {
      currencyData = null;
      valdoUniqueDivinePrices = null;
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
    currencyData = forceFresh
      ? await poeNinjaService.fetchFreshCurrencyDataFor(league, version)
      : await poeNinjaService.fetchCurrencyDataFor(league, version);

    if (showValdoRewardPricing && version === "1") {
      await fetchValdoRewardPrices();
    }
  };

  const forceRefreshEquivalentPricing = async () => {
    await fetchRatios(true);
    refreshEquivalentPricing();
  };

  const fetchValdoRewardPrices = async () => {
    if (tradeLocationService.current.version !== "1" || !tradeLocationService.current.league) {
      valdoUniqueDivinePrices = null;
      return;
    }
    if (valdoUniqueDivinePrices) return;
    if (valdoPriceRequest) return valdoPriceRequest;

    const { league } = tradeLocationService.current;
    const request = poeNinjaService
      .fetchUniqueDivinePricesFor(league)
      .then((prices) => {
        if (tradeLocationService.current.version === "1" && tradeLocationService.current.league === league) {
          valdoUniqueDivinePrices = prices;
        }
      })
      .catch((error) => {
        console.error("[Poe Trade Plus] Failed to fetch Valdo reward prices from poe.ninja:", error);
        if (tradeLocationService.current.version === "1" && tradeLocationService.current.league === league) {
          valdoUniqueDivinePrices = null;
        }
      })
      .finally(() => {
        if (valdoPriceRequest === request) {
          valdoPriceRequest = null;
        }
      });
    valdoPriceRequest = request;
    return request;
  };

  const injectEquivalentPricing = (row: HTMLElement) => {
    const priceInfo = extractPriceInfo(row);
    if (!priceInfo) {
      return;
    }

    const { container: priceContainer, amount, currencyText } = priceInfo;

    if (!currencyData) {
      removeEquivalentPricing(row);
      return;
    }

    if (!currencyText || isNaN(amount)) {
      removeEquivalentPricing(row);
      emitPageDebug("equivalent-missing-details", {
        currency: currencyText,
        amount,
        text: priceContainer.textContent?.trim() || "",
        className: priceContainer.className
      });
      return;
    }

    const slug = resolveCurrencySlug(currencyText);
    const pricedCurrency = currencyData[slug];
    if (!pricedCurrency) {
      removeEquivalentPricing(row);
      emitPageDebug("equivalent-unresolved", {
        amount,
        currencyText,
        slug,
        availableSample: Object.keys(currencyData).slice(0, 10)
      });
      return;
    }

    const version = tradeLocationService.current.version;
    const valueInPrimary = amount * pricedCurrency.value;
    const parts = referenceSlugs[version]
      .filter((referenceSlug) => referenceSlug !== slug)
      .flatMap((referenceSlug) => {
        const reference = currencyData?.[referenceSlug];
        if (!reference?.value) return [];

        const equivalent = valueInPrimary / reference.value;
        const rounded = equivalent >= 10
          ? Math.round(equivalent)
          : Math.round(equivalent * 10) / 10;
        if (!rounded) return [];

        return [{ amount: rounded, slug: referenceSlug, icon: reference.icon }];
      });

    if (parts.length === 0) {
      removeEquivalentPricing(row);
      return;
    }

    emitPageDebug("equivalent-rendered", {
      amount,
      currencyText,
      slug,
      parts
    });
    renderEquivalentPricing(priceContainer, parts);
  };

  const renderEquivalentPricing = (
    container: HTMLElement,
    parts: Array<{ amount: number | string; slug: string; icon: string }>
  ) => {
    let el = container.querySelector(".bt-equivalent-pricings-equivalent") as HTMLElement | null;
    if (!el) {
      el = document.createElement("span");
      el.className = "bt-equivalent-pricings bt-equivalent-pricings-equivalent";
      container.appendChild(el);
    }

    el.replaceChildren();
    el.appendChild(createTextSpan("bt-equivalent-label", "equivalent:"));

    parts.forEach((part, index) => {
      if (index > 0) {
        el!.appendChild(createTextSpan("bt-equivalent-separator", "="));
      }
      el!.appendChild(createCurrencyFragment(part.amount, part.slug, part.icon));
    });
    syncEquivalentVisibility(el!);
  };

  const createCurrencyFragment = (amount: number | string, slug: string, iconUrl: string) => {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(createTextSpan("bt-equivalent-amount", String(amount)));

    const icon = document.createElement("img");
    icon.className = "bt-equivalent-icon currency-icon";
    icon.alt = slug;
    icon.src = iconUrl || getCurrencyIconUrl(slug === CHAOS_SLUG ? "chaos" : "divine");
    fragment.appendChild(icon);

    return fragment;
  };

  const createTextSpan = (className: string, text: string) => {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = text;
    return span;
  };

  const removeEquivalentPricing = (row: HTMLElement) => {
    row.querySelectorAll(".bt-equivalent-pricings-equivalent").forEach((el) => el.remove());
  };

  const injectValdoRewardPricing = (row: HTMLElement) => {
    if (!showValdoRewardPricing || tradeLocationService.current.version !== "1") {
      removeValdoRewardPricing(row);
      return;
    }

    const rewardName = extractValdoRewardName(row);
    const priceInfo = extractPriceInfo(row);
    if (!rewardName || !priceInfo || !valdoUniqueDivinePrices || !currencyData) {
      removeValdoRewardPricing(row);
      return;
    }

    const rewardValue = valdoUniqueDivinePrices[slugify(normalizeValdoRewardName(rewardName))];
    const divineValue = currencyData["divine-orb"]?.value;
    const priceCurrency = currencyData[resolveCurrencySlug(priceInfo.currencyText)]?.value;
    if (rewardValue === undefined || !divineValue || !priceCurrency || !Number.isFinite(priceInfo.amount)) {
      removeValdoRewardPricing(row);
      return;
    }

    const mapCostInDivines = (priceInfo.amount * priceCurrency) / divineValue;
    renderValdoRewardPricing(priceInfo.container, rewardValue, rewardValue - mapCostInDivines);
  };

  const renderValdoRewardPricing = (container: HTMLElement, rewardValue: number, profit: number) => {
    let element = container.querySelector<HTMLElement>(".bt-valdo-reward-pricing");
    if (!element) {
      element = document.createElement("span");
      element.className = "bt-equivalent-pricings bt-valdo-reward-pricing";
      container.appendChild(element);
    }
    const language = settings.getCurrent().language;
    const format = (value: number) => Math.round(value * 10) / 10;
    const formattedProfit = format(profit);
    const divineIcon = currencyData?.["divine-orb"]?.icon || getCurrencyIconUrl("divine");
    element.replaceChildren(
      createTextSpan("bt-valdo-reward-label", `${translate(language, "results.valdoReward")} `),
      createCurrencyFragment(format(rewardValue), "divine-orb", divineIcon),
      createTextSpan(
        `bt-valdo-profit ${formattedProfit >= 0 ? "is-positive" : "is-negative"}`,
        ` ${translate(language, "results.valdoProfit")} `
      ),
      createCurrencyFragment(
        `${formattedProfit >= 0 ? "+" : ""}${formattedProfit}`,
        "divine-orb",
        divineIcon
      )
    );
  };

  const removeValdoRewardPricing = (row: HTMLElement) => {
    row.querySelectorAll(".bt-valdo-reward-pricing").forEach((element) => element.remove());
  };

  const syncEquivalentVisibility = (element: HTMLElement) => {
    const isHidden = !showEquivalentPricing;
    element.classList.toggle("is-hidden", isHidden);
    element.toggleAttribute("hidden", isHidden);
    element.style.display = isHidden ? "none" : "block";
    element.setAttribute("aria-hidden", String(isHidden));
  };

  const startObserving = () => {
    unsubscribeObserver?.();
    unsubscribeObserver = tradeDomObserver.subscribe({
      id: "item-results",
      selector: resultsContainer,
      debounceMs: 100,
      handler: () => enhanceResults()
    });
  };

  const schedulePostSearchRefresh = () => {
    searchRefreshTimers.forEach((timer) => window.clearTimeout(timer));
    searchRefreshTimers = postSearchRefreshDelays.map((delay) =>
      window.setTimeout(() => enhanceResults(), delay)
    );
  };

  const enhanceResults = () => {
    // Current trade site uses .result-item, but some pages or versions use .row.
    // Re-run equivalent pricing on every visible result because the trade site can recycle DOM nodes between searches.
    const results = tradeDom.getItemResultRows();
    results.forEach((row: Element) => {
      const typedRow = row as HTMLElement;
      enablePoe2CopyButton(typedRow);
      syncCoeButton(typedRow);
      syncWikiButton(typedRow);
      syncPoedbButton(typedRow);
      injectEquivalentPricing(typedRow);
      injectValdoRewardPricing(typedRow);
      enhanceMagebloodLegacy(typedRow);
      syncPinButton(typedRow);
      if (typedRow.hasAttribute("bt-enhanced")) {
        return;
      }

      typedRow.setAttribute("bt-enhanced", "true");
      checkMaximumSockets(typedRow);
    });
  };

  const enablePoe2CopyButton = (row: HTMLElement) => {
    if (tradeLocationService.current.version !== "2") return;

    const rowCopyButton = row.querySelector<HTMLButtonElement>(copyButton);
    if (!rowCopyButton) return;

    experimentalSettings.applyPoe2CopyButton(rowCopyButton);
  };

  const syncCoeButton = (row: HTMLElement) => {
    const left = row.querySelector<HTMLElement>(".left");
    if (!left) return;

    const searchByButton = left.querySelector<HTMLButtonElement>("button.searchBy");
    let button = left.querySelector<HTMLButtonElement>("button.bt-copy-coe");
    if (!experimentalSettings.isCoeVisible()) {
      button?.remove();
      return;
    }

    if (button) {
      syncCoeButtonUnsupportedState(button, row);
      if (searchByButton) positionCoeButton(button, searchByButton);
      return;
    }

    button = document.createElement("button");
    button.type = "button";
    button.className = "bt-copy-coe";
    button.setAttribute("aria-label", "Copy for Craft of Exile");
    syncCoeButtonUnsupportedState(button, row);

    const image = document.createElement("img");
    image.src = coeButtonImage;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    button.appendChild(image);
    if (searchByButton) {
      searchByButton.insertAdjacentElement("afterend", button);
      positionCoeButton(button, searchByButton);
    } else {
      left.appendChild(button);
    }
  };

  const syncPinButton = (row: HTMLElement) => {
    const existingButton = row.querySelector<HTMLButtonElement>("button.bt-pin-button");
    if (!showPinnedItems) {
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
        const title = row.querySelector<HTMLElement>(itemTitleLine)?.textContent?.trim() || "Item";
        pinnedItemsService.toggle({
          id: currentId,
          title,
          detailsHtml: row.querySelector<HTMLElement>(pinnedItemDetails)?.outerHTML || "",
          renderedHtml: row.querySelector<HTMLElement>(".item")?.outerHTML || "",
          pricingHtml: row.querySelector<HTMLElement>(itemPrice)?.outerHTML || ""
        });
        console.debug("[Poe Trade Plus] Pin toggled", { currentId });
        syncPinButton(row);
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
  };

  const refreshPinButtons = () => {
    tradeDom
      .getItemResultRows()
      .forEach((row) => syncPinButton(row));
  };

  const syncWikiButton = (row: HTMLElement) => {
    const left = row.querySelector<HTMLElement>(".left");
    if (!left) return;

    const existingButton = left.querySelector<HTMLButtonElement>("button.bt-open-wiki");
    const searchByButton = left.querySelector<HTMLButtonElement>("button.searchBy");
    const wikiUrl = experimentalSettings.isWikiVisible() && isEnglishTradeHost()
      ? getItemWikiUrl(row)
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
      positionResultActionButton(button, searchByButton, coeButton ? 1 : 0);
    } else if (!button.isConnected) {
      left.appendChild(button);
    }
  };

  const syncPoedbButton = (row: HTMLElement) => {
    const left = row.querySelector<HTMLElement>(".left")
    if (!left) return

    const existingButton = left.querySelector<HTMLButtonElement>("button.bt-open-poedb")
    const searchByButton = left.querySelector<HTMLButtonElement>("button.searchBy")
    const poedbUrl = experimentalSettings.isWikiVisible() && isEnglishTradeHost()
      ? getItemPoedbUrl(row)
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
      positionResultActionButton(button, searchByButton, index)
    } else if (!button.isConnected) {
      left.appendChild(button)
    }
  };

  const getItemPoedbUrl = (row: HTMLElement) => {
    const name = getExternalItemName(row)
    if (!name || tradeLocationService.current.version !== "1") return null

    const pageName = encodeURIComponent(
      name.replace(/['’]/g, "").replace(/\s+/g, "_")
    )
    return `https://poedb.tw/us/${pageName}`
  };

  const getItemWikiUrl = (row: HTMLElement) => {
    const name = getExternalItemName(row)
    if (!name) return null

    const baseUrl = tradeLocationService.current.version === "2"
      ? "https://www.poe2wiki.net/wiki/"
      : "https://www.poewiki.net/wiki/"
    const pageName = encodeURIComponent(name.replace(/\s+/g, "_")).replace(/'/g, "%27")
    return `${baseUrl}${pageName}`
  };

  const getExternalItemName = (row: HTMLElement) => {
    const header = row.querySelector<HTMLElement>(uniqueItemHeader)
    const name = header
      ?.querySelector<HTMLElement>(itemPopupHeaderLine)
      ?.textContent
      ?.trim();

    if (!name) return null;
    return name
  };

  const syncCoeButtonUnsupportedState = (button: HTMLButtonElement, row: HTMLElement) => {
    const unsupported = hasUnsupportedCraftOfExileMod(row);
    button.classList.toggle("bt-copy-coe--disabled", unsupported);
    button.setAttribute("aria-disabled", unsupported ? "true" : "false");
    button.title = unsupported
      ? "Craft of Exile can't import this item yet (Prefix/Suffix Modifier mods)."
      : "Copy for Craft of Exile";
  };

  const positionCoeButton = (button: HTMLButtonElement, searchByButton: HTMLButtonElement) => {
    positionResultActionButton(button, searchByButton, 0);
  };

  const positionResultActionButton = (button: HTMLButtonElement, searchByButton: HTMLButtonElement, index: number) => {
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
  };

  const refreshEquivalentPricing = () => {
    const results = tradeDom.getItemResultRows();
    results.forEach((row) => injectEquivalentPricing(row as HTMLElement));
  };

  const refreshValdoRewardPricing = () => {
    const results = tradeDom.getItemResultRows();
    results.forEach((row) => injectValdoRewardPricing(row as HTMLElement));
  };

  const enhanceMagebloodLegacy = (row: HTMLElement) => {
    if (!showMagebloodLegacyDescriptions) {
      removeMagebloodLegacyDescriptions(row);
      return;
    }

    removeMagebloodLegacyDescriptions(row);

    const legacies: MagebloodLegacy[] = [];
    const duplicateMods: HTMLElement[] = [];
    let duplicatePercent = 0;

    row.querySelectorAll<HTMLElement>(modValueSpan).forEach((valueSpan) => {
      const inner = valueSpan.querySelector<HTMLElement>("span") || valueSpan;
      const text = (inner.textContent || "").replace(/\s+/g, " ").trim();
      const field = valueSpan.dataset.field || "";
      const mod = valueSpan.closest<HTMLElement>(modElement);

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
      const explanationAnchor = findMagebloodExplanationAnchor(row, legacies);
      const fragment = document.createDocumentFragment();
      fragment.appendChild(
        buildMagebloodLegacyExplanations(counts, displayTitles, multiplier, increasedEffect)
      );

      explanationAnchor?.after(fragment);
    }
  };

  const removeMagebloodLegacyDescriptions = (row: HTMLElement) => {
    row
      .querySelectorAll(`.${MAGEBLOOD_EXPLANATIONS_CLASS}`)
      .forEach((element) => element.remove());
    row
      .querySelectorAll(`.${MAGEBLOOD_LEGACY_CLASS}`)
      .forEach((element) => element.classList.remove(MAGEBLOOD_LEGACY_CLASS));
  };

  const createMagebloodDiv = (className: string, text?: string) => {
    const el = document.createElement("div");
    el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const findMagebloodExplanationAnchor = (
    row: HTMLElement,
    legacies: MagebloodLegacy[]
  ) => {
    const content = row.querySelector<HTMLElement>(itemPopupContent) || row;
    const flagsHr = content.querySelector<HTMLHRElement>(flagsSeparator);
    if (flagsHr) {
      return flagsHr;
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

    const explicitHr = content.querySelector<HTMLHRElement>(explicitSeparator);
    if (explicitHr) {
      return explicitHr;
    }

    return legacies[legacies.length - 1]?.mod || content.lastElementChild;
  };

  const buildMagebloodLegacyExplanations = (
    counts: Record<string, number>,
    displayTitles: Record<string, string>,
    multiplier: number,
    increasedEffect: number
  ) => {
    const container = createMagebloodDiv(MAGEBLOOD_EXPLANATIONS_CLASS);
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
  };

  const refreshMagebloodLegacyDescriptions = () => {
    const results = tradeDom.getItemResultRows();
    results.forEach((row) => enhanceMagebloodLegacy(row as HTMLElement));
  };



  const checkMaximumSockets = (row: HTMLElement) => {
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
  };

  const feature = createFeatureLifecycle("item-results", () => {
    emitPageDebug("item-results-initialize", {
      href: window.location.href
    });

    void (async () => {
      if (window.location.protocol === "chrome-extension:") {
        return;
      }

      await settings.load();
      showEquivalentPricing = settings.getCurrent().showEquivalentPricing;
      showValdoRewardPricing =
        settings.getCurrent().showValdoRewardPricing && !isNativeChineseTradeSite();
      showMagebloodLegacyDescriptions = settings.getCurrent().showMagebloodLegacyDescriptions;
      showPinnedItems = settings.getCurrent().showPinnedItems;
      unsubscribeSettings?.();
      unsubscribeSettings = settings.subscribe((value) => {
        const changed = showEquivalentPricing !== value.showEquivalentPricing;
        const nextValdoRewardPricing =
          value.showValdoRewardPricing && !isNativeChineseTradeSite();
        const valdoChanged = showValdoRewardPricing !== nextValdoRewardPricing;
        const magebloodChanged =
          showMagebloodLegacyDescriptions !== value.showMagebloodLegacyDescriptions;
        const pinsChanged = showPinnedItems !== value.showPinnedItems;
        showEquivalentPricing = value.showEquivalentPricing;
        showValdoRewardPricing = nextValdoRewardPricing;
        showMagebloodLegacyDescriptions = value.showMagebloodLegacyDescriptions;
        showPinnedItems = value.showPinnedItems;
        if (changed) {
          refreshEquivalentPricing();
        }
        if (valdoChanged) {
          if (showValdoRewardPricing) {
            void fetchValdoRewardPrices().then(() => {
              refreshValdoRewardPricing();
              schedulePostSearchRefresh();
            });
          } else {
            refreshValdoRewardPricing();
          }
        }
        if (magebloodChanged) {
          refreshMagebloodLegacyDescriptions();
        }
        if (pinsChanged) {
          refreshPinButtons();
        }
      });
      unsubscribeLocation?.();
      unsubscribeLocation = tradeLocationService.onChange(() => {
        void handleLocationChange();
      });

      try {
        await fetchRatios();
      } catch (e) {
        console.error("[Poe Trade Plus] Failed to fetch ratios from poe.ninja:", e);
      }

      startObserving();
      document.removeEventListener("click", handleDocumentClick, true);
      document.addEventListener("click", handleDocumentClick, true);
      unsubscribeExperimental?.();
      unsubscribeExperimental = extensionBus.on(
        "item-results:experimental-change",
        handleExperimentalChange
      );
    })();

    return () => {
      unsubscribeSettings?.();
      unsubscribeSettings = null;
      unsubscribeLocation?.();
      unsubscribeLocation = null;
      unsubscribeExperimental?.();
      unsubscribeExperimental = null;
      unsubscribeObserver?.();
      unsubscribeObserver = null;
      searchRefreshTimers.forEach((timer) => window.clearTimeout(timer));
      searchRefreshTimers = [];
      document.removeEventListener("click", handleDocumentClick, true);
    };
  });

  return {
    ...feature,
    forceRefreshEquivalentPricing
  };
};

export const itemResults = createItemResults();