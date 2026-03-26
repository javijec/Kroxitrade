import { writable } from "svelte/store";
import { poeNinjaService } from "./poe-ninja";
import { tradeLocationService } from "./trade-location";
import { searchPanelService } from "./search-panel";
import { slugify } from "../utilities/slugify";
import { escapeRegex } from "../utilities/escape-regex";
import { storageService } from "./storage";

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

const PINNED_ITEMS_STORAGE_KEY = "pinned-items";
const pinnedItemsStore = writable<PinnedItem[]>([]);

export class ItemResultsService {
  private chaosRatios: Record<string, number> | null = null;
  private statNeedles: RegExp[] = [];
  private readonly DIVINE_SLUG = "divine-orb";
  private readonly CHAOS_SLUG = "chaos-orb";
  private hasHydratedPinnedItems = false;
  private storageListenerRegistered = false;

  subscribe = pinnedItemsStore.subscribe;

  async initialize() {
    await this.ensurePinnedItemsHydrated();
    if (window.location.protocol === "chrome-extension:") {
      return;
    }
    await this.fetchRatios();
    this.prepareHighlighting();
    this.startObserving();
  }

  private async ensurePinnedItemsHydrated() {
    if (!this.hasHydratedPinnedItems) {
      const storedItems = await storageService.getValue<PinnedItem[]>(PINNED_ITEMS_STORAGE_KEY);
      pinnedItemsStore.set(storedItems || []);
      this.hasHydratedPinnedItems = true;
    }

    if (!this.storageListenerRegistered && typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local" || !changes[PINNED_ITEMS_STORAGE_KEY]) {
          return;
        }

        pinnedItemsStore.set(changes[PINNED_ITEMS_STORAGE_KEY].newValue?.value || []);
      });
      this.storageListenerRegistered = true;
    }
  }

  private async setPinnedItems(items: PinnedItem[]) {
    pinnedItemsStore.set(items);
    await storageService.setValue(PINNED_ITEMS_STORAGE_KEY, items);
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
    // Current trade site uses .result-item, but some pages or versions use .row
    const results = document.querySelectorAll(".search-results .result-item:not([bt-enhanced]), .search-results .row:not([bt-enhanced]), .result-list .result-item:not([bt-enhanced])");
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
    // Look for button containers: .btns is classic, .actions or .details .btns are other variants
    const btns = row.querySelector(".details .btns, .btns, .actions");
    if (!btns) return;

    const btn = document.createElement("button");
    btn.className = "btn btn-default bt-pin-button";
    btn.innerHTML = "Pin";
    btn.onclick = (e) => {
        e.stopPropagation();
        this.togglePin(row);
    };
    
    const wrapper = document.createElement("span");
    wrapper.className = "bt-pin-wrapper";
    wrapper.appendChild(btn);
    btns.appendChild(wrapper);
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

  private togglePin(row: HTMLElement) {
    const id = row.dataset.id;
    if (!id) return;

    let nextItems: PinnedItem[] | null = null;

    pinnedItemsStore.update((items) => {
      const exists = items.find(i => i.id === id);
      if (exists) {
        row.classList.remove("bt-pinned");
        nextItems = items.filter(i => i.id !== id);
        return nextItems;
      }

      const pinned = this.createPinnedItem(row);
      if (pinned) {
        row.classList.add("bt-pinned");
        nextItems = [...items, pinned];
        return nextItems;
      }

      nextItems = items;
      return items;
    });

    if (nextItems) {
      void this.setPinnedItems(nextItems);
    }
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
    let nextItems: PinnedItem[] = [];

    pinnedItemsStore.update((items) => {
      nextItems = items.filter(i => i.id !== id);
      return nextItems;
    });

    void this.setPinnedItems(nextItems);
    const row = document.querySelector(`.row[data-id="${id}"]`);
    if (row) row.classList.remove("bt-pinned");
  }

  clear() {
    void this.setPinnedItems([]);
    document.querySelectorAll(".bt-pinned").forEach(el => el.classList.remove("bt-pinned"));
  }
}

export const itemResultsService = new ItemResultsService();
