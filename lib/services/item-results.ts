import { writable } from "svelte/store";
import { poeNinjaService } from "./poe-ninja";
import { tradeLocationService } from "./trade-location";
import { searchPanelService } from "./search-panel";
import { slugify } from "../utilities/slugify";
import { escapeRegex } from "../utilities/escape-regex";

export interface PinnedItem {
  id: string;
  detailsHtml: string;
  renderedHtml: string;
  pricingHtml: string;
  pinnedAt: string;
}

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

const { subscribe, update, set } = writable<PinnedItem[]>([]);

export class ItemResultsService {
  private chaosRatios: Record<string, number> | null = null;
  private statNeedles: RegExp[] = [];
  private readonly DIVINE_SLUG = "divine-orb";
  private readonly CHAOS_SLUG = "chaos-orb";

  subscribe = subscribe;

  async initialize() {
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
    const results = document.querySelectorAll(".search-results .row:not([bt-enhanced])");
    results.forEach((row: HTMLElement) => {
      row.setAttribute("bt-enhanced", "true");
      this.injectPinButton(row);
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

  private injectPinButton(row: HTMLElement) {
    const btns = row.querySelector(".details .btns");
    if (!btns) return;

    const btn = document.createElement("button");
    btn.className = "btn btn-default bt-pin-button";
    btn.innerHTML = "Pin";
    btn.onclick = (e) => {
        e.stopPropagation();
        this.togglePin(row);
    };
    
    const wrapper = document.createElement("span");
    wrapper.appendChild(btn);
    btns.appendChild(wrapper);
  }

  private injectEquivalentPricing(row: HTMLElement) {
    if (!this.chaosRatios) return;

    const priceContainer = row.querySelector(".price") as HTMLElement;
    if (!priceContainer) return;

    const currencyText = row.querySelector('[data-field="price"] .currency-text span')?.textContent;
    const amountText = row.querySelector('[data-field="price"] > br + span')?.textContent;

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

  private togglePin(row: HTMLElement) {
    const id = row.dataset.id;
    if (!id) return;

    update(items => {
      const exists = items.find(i => i.id === id);
      if (exists) {
        row.classList.remove("bt-pinned");
        return items.filter(i => i.id !== id);
      } else {
        const pinned = this.createPinnedItem(row);
        if (pinned) {
          row.classList.add("bt-pinned");
          return [...items, pinned];
        }
        return items;
      }
    });
  }

  private createPinnedItem(row: HTMLElement): PinnedItem | null {
    const id = row.dataset.id;
    const details = row.querySelector(".middle");
    const rendered = row.querySelector(".itemRendered");
    const pricing = row.querySelector(".details .price");

    if (!id || !details || !rendered || !pricing) return null;

    return {
      id,
      detailsHtml: details.innerHTML,
      renderedHtml: rendered.innerHTML,
      pricingHtml: pricing.innerHTML,
      pinnedAt: new Date().toISOString()
    };
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

  unpin(id: string) {
    update(items => items.filter(i => i.id !== id));
    const row = document.querySelector(`.row[data-id="${id}"]`);
    if (row) row.classList.remove("bt-pinned");
  }

  clear() {
    set([]);
    document.querySelectorAll(".bt-pinned").forEach(el => el.classList.remove("bt-pinned"));
  }
}

export const itemResultsService = new ItemResultsService();
