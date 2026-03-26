import { writable } from "svelte/store";
import { poeNinjaService } from "./poe-ninja";
import { tradeLocationService } from "./trade-location";
import { searchPanelService } from "./search-panel";
import { slugify } from "../utilities/slugify";
import { escapeRegex } from "../utilities/escape-regex";
import { storageService } from "./storage";



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
  async initialize() {
    if (window.location.protocol === "chrome-extension:") {
      return;
    }
    await this.fetchRatios();
    this.prepareHighlighting();
    this.startObserving();
  }



  private async fetchRatios() {
    const league = tradeLocationService.current.league;
    if (league) {
        this.chaosRatios = await poeNinjaService.fetchChaosRatiosFor(league);
    }
  }

  private injectEquivalentPricing(row: HTMLElement) {
    if (!this.chaosRatios) return;

    const priceContainer = row.querySelector(".price, .details .price") as HTMLElement;
    if (!priceContainer) return;

    // Official site structure often has nested spans for currency and amount
    const currencyText = row.querySelector('[data-field="price"] .currency-text span, [data-field="price"] .currency-icon')?.textContent || 
                       row.querySelector('.currency-text')?.textContent;
    const amountText = row.querySelector('[data-field="price"] span:last-child, .price span:last-child')?.textContent;

    if (!currencyText || !amountText) return;

    const slug = slugify(currencyText);
    const amount = parseFloat(amountText);
    const ratio = this.chaosRatios[slug];
    const divineRatio = this.chaosRatios[this.DIVINE_SLUG];

    if (slug !== this.CHAOS_SLUG && ratio) {
        const chaosEquiv = Math.round(amount * ratio);
        this.appendEquiv(priceContainer, `${chaosEquiv}× chaos`);
    } else if (slug === this.CHAOS_SLUG && divineRatio && amount >= divineRatio * 0.5) {
        const divineEquiv = (amount / divineRatio).toFixed(1);
        this.appendEquiv(priceContainer, `${divineEquiv}× divine`);
    }
  }

  private appendEquiv(container: HTMLElement, text: string) {
    const el = document.createElement("div");
    el.className = "bt-equivalent-pricing";
    el.style.fontSize = "11px";
    el.style.color = "#a38d6d";
    el.style.marginTop = "2px";
    el.innerHTML = `= ${text}`;
    container.appendChild(el);
  }

  private prepareHighlighting() {
    const stats = searchPanelService.getStats();
    this.statNeedles = stats.map(s => new RegExp(escapeRegex(s).replace(/#/g, '[\\+\\-]?\\d+'), 'i'));
  }

  private startObserving() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          this.enhanceResults();
        }
      }
    });

    const target = document.querySelector(".search-results");
    if (target) {
      observer.observe(target, { childList: true, subtree: true });
      this.enhanceResults();
    } else {
      setTimeout(() => this.startObserving(), 1000);
    }
  }

  private enhanceResults() {
    // Current trade site uses .result-item, but some pages or versions use .row
    const results = document.querySelectorAll(".search-results .result-item:not([bt-enhanced]), .search-results .row:not([bt-enhanced]), .result-list .result-item:not([bt-enhanced])");
    results.forEach((row: HTMLElement) => {
      row.setAttribute("bt-enhanced", "true");
      this.injectEquivalentPricing(row);
      this.highlightStats(row);
      this.checkMaximumSockets(row);
    });
  }

  private highlightStats(row: HTMLElement) {
    if (this.statNeedles.length === 0) return;

    const mods = row.querySelectorAll(".explicitMod, .pseudoMod, .implicitMod");
    mods.forEach((mod: HTMLElement) => {
        const text = mod.textContent || "";
        if (this.statNeedles.some(n => n.test(text))) {
            mod.classList.add("bt-highlight-stat-filters");
            mod.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            mod.style.border = "1px solid rgba(255, 255, 0, 0.3)";
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
