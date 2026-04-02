import { writable } from "svelte/store";
import { poeNinjaService } from "./poe-ninja";
import { tradeLocationService } from "./trade-location";
import { searchPanelService } from "./search-panel";
import { settings } from "./settings";
import { slugify } from "../utilities/slugify";
import { escapeRegex } from "../utilities/escape-regex";



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



export class ItemResultsService {
  private chaosRatios: Record<string, number> | null = null;
  private statNeedles: RegExp[] = [];
  private readonly DIVINE_SLUG = "divine-orb";
  private readonly CHAOS_SLUG = "chaos-orb";
  private readonly CHAOS_ICON_URL = "https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyRerollRare.png?scale=1&w=1&h=1";
  private readonly DIVINE_ICON_URL = "https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyModValues.png?scale=1&w=1&h=1";
  private showEquivalentPricing = false;
  private unsubscribeSettings: (() => void) | null = null;
  private unsubscribeLocation: (() => void) | null = null;
  private readonly postSearchRefreshDelays = [80, 220, 500, 900];
  private searchRefreshTimers: number[] = [];
  private readonly handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target?.closest(".btn.search-btn")) return;
    this.schedulePostSearchRefresh();
  };

  async initialize() {
    console.log("[Poe Trade Plus] Initializing ItemResultsService...");
    if (window.location.protocol === "chrome-extension:") {
      return;
    }

    await settings.load();
    this.showEquivalentPricing = settings.getCurrent().showEquivalentPricing;
    this.unsubscribeSettings?.();
    this.unsubscribeSettings = settings.subscribe((value) => {
      const changed = this.showEquivalentPricing !== value.showEquivalentPricing;
      this.showEquivalentPricing = value.showEquivalentPricing;
      if (changed) {
        this.refreshEquivalentPricing();
      }
    });
    this.unsubscribeLocation?.();
    this.unsubscribeLocation = tradeLocationService.onChange(() => {
      void this.handleLocationChange();
    });
    
    try {
      await this.fetchRatios();
      console.log("[Poe Trade Plus] Ratios loaded successfully:", this.chaosRatios ? "YES" : "NO");
    } catch (e) {
      console.error("[Poe Trade Plus] Failed to fetch ratios from poe.ninja:", e);
    }

    this.prepareHighlighting();
    this.startObserving();
    document.addEventListener("click", this.handleDocumentClick, true);
  }

  private async handleLocationChange() {
    try {
      await this.fetchRatios();
    } catch (e) {
      console.error("[Poe Trade Plus] Failed to refresh ratios after location change:", e);
    }

    this.schedulePostSearchRefresh();
    this.refreshEquivalentPricing();
  }



  private async fetchRatios() {
    const { league, type, slug } = tradeLocationService.current;

    if (!league || !type || !slug) {
      this.chaosRatios = null;
      return;
    }

    console.log("[Poe Trade Plus] Current league detected:", league);
    this.chaosRatios = await poeNinjaService.fetchChaosRatiosFor(league);
  }

  private injectEquivalentPricing(row: HTMLElement) {
    // Busca explícitamente el div con class "price" como pidió el usuario
    const priceContainer = row.querySelector("div.price, .details .price") as HTMLElement;
    if (!priceContainer) {
        console.debug("[Poe Trade Plus] Skipping pricing injection - Missing priceContainer for row", row);
        return;
    }

    if (!this.chaosRatios) {
        this.removeEquivalentPricing(row);
        return;
    }

    // Buscar explícitamente el texto de la moneda
    const currencyTextTag = row.querySelector('[data-field="price"] .currency-text span, .currency-text span, .currency-text');
    const currencyText = currencyTextTag?.textContent?.trim() || "";
                       
    // Buscar la cantidad: Iterar por todos los nodos hoja para encontrar el primero que sea un número válido
    let amountText = "";
    const leafNodes = Array.from(priceContainer.querySelectorAll('span, div'));
    for (const node of leafNodes) {
        // Ignorar el nombre de la moneda
        if (node.classList?.contains("currency-text") || node.closest('.currency-text')) continue;
        // Ignorar nuestro propio bloque equivalente para no reparsear valores inyectados.
        if (node.classList?.contains("bt-equivalent-pricings-equivalent") || node.closest('.bt-equivalent-pricings-equivalent')) continue;
        
        const text = node.textContent?.trim() || "";
        const match = text.match(/[0-9]+(\.[0-9]+)?/);
        if (match) {
            amountText = match[0];
            break;
        }
    }

    const amount = parseFloat(amountText);

    if (!currencyText || isNaN(amount)) {
        this.removeEquivalentPricing(row);
        console.debug("[Poe Trade Plus] Skipping pricing injection - Missing details:", { currency: currencyText, amount: amountText, html: priceContainer.innerHTML });
        return;
    }

    const slug = slugify(currencyText);
    const ratio = this.chaosRatios[slug];
    const divineRatio = this.chaosRatios[this.DIVINE_SLUG];
    const parts: Array<{ amount: number | string; slug: string } | { separator: true }> = [];

    if (slug === this.DIVINE_SLUG && ratio) {
        // Original price is Divine, e.g. 1.4 Divines
        const totalChaos = Math.round(amount * ratio);
        const wholeDivines = Math.floor(amount);
        const remainderFraction = amount - wholeDivines;
        const remainderChaos = Math.round(remainderFraction * ratio);

        if (wholeDivines > 0 && remainderChaos > 0) {
            parts.push({ amount: wholeDivines, slug: this.DIVINE_SLUG });
            parts.push({ separator: true });
            parts.push({ amount: remainderChaos, slug: this.CHAOS_SLUG });
        } else if (wholeDivines === 0 && remainderChaos > 0) {
            parts.push({ amount: remainderChaos, slug: this.CHAOS_SLUG });
        } else {
            parts.push({ amount: totalChaos, slug: this.CHAOS_SLUG });
        }

    } else if (slug === this.CHAOS_SLUG && divineRatio && amount >= divineRatio * 0.5) {
        // Original price is Chaos, e.g. 195 Chaos
        const wholeDivines = Math.floor(amount / divineRatio);
        const remainderChaos = Math.round(amount % divineRatio);

        if (wholeDivines > 0) {
            parts.push({ amount: wholeDivines, slug: this.DIVINE_SLUG });
            if (remainderChaos > 0) {
                parts.push({ separator: true });
                parts.push({ amount: remainderChaos, slug: this.CHAOS_SLUG });
            }
        } else {
            // Less than 1 Divine (e.g. 100 chaos). Just show fraction: 0.7 Divine
            const fraction = (amount / divineRatio).toFixed(1);
            parts.push({ amount: fraction, slug: this.DIVINE_SLUG });
        }

    } else if (slug !== this.CHAOS_SLUG && slug !== this.DIVINE_SLUG && ratio) {
        // Other currencies (like Exalted orbs). Just show total chaos equivalent.
        const chaosEquiv = Math.round(amount * ratio);
        parts.push({ amount: chaosEquiv, slug: this.CHAOS_SLUG });
    } else {
        this.removeEquivalentPricing(row);
        console.debug(`[Poe Trade Plus] Could not determine equivalence for ${amountText} ${currencyText} (slug: ${slug})`);
        return;
    }

    this.renderEquivalentPricing(priceContainer, parts);
  }

  private renderEquivalentPricing(
    container: HTMLElement,
    parts: Array<{ amount: number | string; slug: string } | { separator: true }>
  ) {
    let el = container.querySelector(".bt-equivalent-pricings-equivalent") as HTMLElement | null;
    if (!el) {
      el = document.createElement("span");
      el.className = "bt-equivalent-pricings bt-equivalent-pricings-equivalent";
      container.appendChild(el);
    }

    el.replaceChildren();
    el.appendChild(this.createTextSpan("bt-equivalent-label", "equivalent:"));

    parts.forEach((part) => {
      if ("separator" in part) {
        el.appendChild(this.createTextSpan("bt-equivalent-separator", "+"));
        return;
      }

      el.appendChild(this.createCurrencyFragment(part.amount, part.slug));
    });
    this.syncEquivalentVisibility(el);
  }

  private createCurrencyFragment(amount: number | string, slug: string) {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this.createTextSpan("bt-equivalent-amount", String(amount)));

    const icon = document.createElement("img");
    icon.className = "bt-equivalent-icon currency-icon";
    icon.alt = slug;
    icon.src = slug === this.CHAOS_SLUG ? this.CHAOS_ICON_URL : this.DIVINE_ICON_URL;
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

  private syncEquivalentVisibility(element: HTMLElement) {
    const isHidden = !this.showEquivalentPricing;
    element.classList.toggle("is-hidden", isHidden);
    element.toggleAttribute("hidden", isHidden);
    element.style.display = isHidden ? "none" : "block";
    element.setAttribute("aria-hidden", String(isHidden));
  }

  private prepareHighlighting() {
    const stats = searchPanelService.getStats();
    this.statNeedles = stats.map(s => new RegExp(escapeRegex(s).replace(/#/g, '[\\+\\-]?\\d+'), 'i'));
  }

  private observerTimer: ReturnType<typeof setTimeout> | null = null;

  private startObserving() {
    const observer = new MutationObserver((mutations) => {
      if (this.observerTimer) clearTimeout(this.observerTimer);
      this.observerTimer = setTimeout(() => this.enhanceResults(), 100);
    });

    const target = document.querySelector(".search-results, .resultset, .results");
    if (target) {
      console.log(`[Poe Trade Plus] Attached observer to container: ${target.className}`);
      observer.observe(target, { childList: true, subtree: true });
      this.enhanceResults();
    } else {
      // Fallback: observe body but keep trying to find the specific container
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        this.startObserving();
      }, 2000);
    }
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
    const results = document.querySelectorAll(".search-results .result-item, .search-results .row, .result-list .result-item, .row");
    const newResults = Array.from(results).filter((row) => !row.hasAttribute("bt-enhanced"));

    if (results.length > 0) {
        console.log(`[Poe Trade Plus] Refreshing ${results.length} results (${newResults.length} new rows)...`);
    }

    results.forEach((row: Element) => {
      const typedRow = row as HTMLElement;
      this.injectEquivalentPricing(typedRow);

      if (typedRow.hasAttribute("bt-enhanced")) {
        return;
      }

      typedRow.setAttribute("bt-enhanced", "true");
      this.highlightStats(typedRow);
      this.checkMaximumSockets(typedRow);
    });
  }

  private refreshEquivalentPricing() {
    const results = document.querySelectorAll(".search-results .result-item, .search-results .row, .result-list .result-item, .row");
    results.forEach((row) => this.injectEquivalentPricing(row as HTMLElement));
  }

  private highlightStats(row: HTMLElement) {
    if (this.statNeedles.length === 0) return;

    const mods = row.querySelectorAll(".explicitMod, .pseudoMod, .implicitMod");
    mods.forEach((mod: HTMLElement) => {
        const text = mod.textContent || "";
        if (this.statNeedles.some(n => n.test(text))) {
            mod.classList.add("bt-highlight-stat-filters");
        }
    });
  }



  private checkMaximumSockets(row: HTMLElement) {
    if (tradeLocationService.current.version !== "1") return;

    const ilvlEl = row.querySelector(".itemLevel");
    const ilvlMatch = ilvlEl?.textContent?.match(/(\d+)/);
    if (!ilvlMatch) return;
    const ilvl = parseInt(ilvlMatch[0], 10);

    const socketsCount = row.querySelectorAll(".sockets .socket").length;
    if (socketsCount === 0) return;

    const iconImg = row.querySelector(".icon img") as HTMLImageElement;
    const iconSrc = iconImg?.src || "";
    let type = ItemResultsType.UNKNOWN;
    if (/\/BodyArmours\//.test(iconSrc)) type = ItemResultsType.ARMOR;
    else if (/\/OneHandWeapons\/|\/TwoHandWeapons\//.test(iconSrc)) type = ItemResultsType.WEAPON;

    if (type !== ItemResultsType.ARMOR) return;

    const threshold = ILVL_THRESHOLDS.find(t => ilvl <= t.ilvl);
    if (!threshold) return;

    if (threshold.maxSockets > socketsCount) {
        const rendered = row.querySelector(".itemRendered");
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
