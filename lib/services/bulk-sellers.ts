import { writable } from "svelte/store";
import type { BulkSellerGroup, BulkSellerItem } from "../types/bulk-sellers";

const RESULT_SELECTOR = ".search-results .row, .search-results .result-item, .result-list .row, .result-list .result-item, .row[data-id]";
const HIGHLIGHT_CLASS = "bt-bulk-seller-glow";

export class BulkSellersService {
  private readonly groupsStore = writable<BulkSellerGroup[]>([]);
  public subscribe = this.groupsStore.subscribe;
  private observer: MutationObserver | null = null;
  private observerTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;
  private readonly postSearchRefreshDelays = [80, 220, 500, 900];
  private searchRefreshTimers: number[] = [];
  private readonly handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target?.closest(".btn.search-btn")) return;
    this.schedulePostSearchRefresh();
  };

  initialize() {
    if (this.initialized || typeof window === "undefined" || window.location.protocol === "chrome-extension:") {
      return;
    }

    this.initialized = true;
    this.startObserving();
    this.refresh();
    document.addEventListener("click", this.handleDocumentClick, true);
  }

  teardown() {
    this.initialized = false;
    if (this.observerTimer) {
      clearTimeout(this.observerTimer);
      this.observerTimer = null;
    }
    this.searchRefreshTimers.forEach((timer) => window.clearTimeout(timer));
    this.searchRefreshTimers = [];
    this.observer?.disconnect();
    this.observer = null;
    document.removeEventListener("click", this.handleDocumentClick, true);
    this.groupsStore.set([]);
  }

  refresh() {
    const groups = this.collectGroups();
    this.groupsStore.set(groups);
  }

  find(itemId: string) {
    const row = this.resolveRow(itemId);
    if (!row) return false;

    row.scrollIntoView({ block: "center", behavior: "smooth" });
    row.classList.add(HIGHLIGHT_CLASS);
    window.setTimeout(() => row.classList.remove(HIGHLIGHT_CLASS), 1800);
    return true;
  }

  buy(itemId: string) {
    const row = this.resolveRow(itemId);
    if (!row) return false;

    const button = row.querySelector<HTMLElement>("button.direct-btn, .direct-btn, button.btn.direct-btn");
    if (!button) return false;

    button.click();
    return true;
  }

  private startObserving() {
    this.observer?.disconnect();
    this.observer = new MutationObserver(() => {
      if (this.observerTimer) clearTimeout(this.observerTimer);
      this.observerTimer = setTimeout(() => this.refresh(), 120);
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private schedulePostSearchRefresh() {
    this.searchRefreshTimers.forEach((timer) => window.clearTimeout(timer));
    this.searchRefreshTimers = this.postSearchRefreshDelays.map((delay) =>
      window.setTimeout(() => this.refresh(), delay)
    );
  }

  private collectGroups() {
    const rows = Array.from(document.querySelectorAll<HTMLElement>(RESULT_SELECTOR));
    const sellers = new Map<string, BulkSellerItem[]>();

    rows.forEach((row, index) => {
      const item = this.extractItem(row, index);
      if (!item) return;

      const existing = sellers.get(item.seller) ?? [];
      existing.push(item);
      sellers.set(item.seller, existing);
    });

    return Array.from(sellers.entries())
      .map(([seller, items]) => ({
        seller,
        total: items.length,
        items: items.sort((a, b) => a.itemName.localeCompare(b.itemName))
      }))
      .filter((group) => group.total > 1)
      .sort((a, b) => b.total - a.total || a.seller.localeCompare(b.seller));
  }

  private extractItem(row: HTMLElement, index: number): BulkSellerItem | null {
    const seller = this.extractSeller(row);
    const itemName = this.extractItemName(row);
    const priceLabel = this.extractPriceLabel(row);
    const priceAmount = this.extractPriceAmount(priceLabel);
    const currencyIcon = this.extractCurrencyIcon(row);
    const rowId = row.dataset.id || row.getAttribute("data-id");

    if (!seller) {
      return null;
    }

    const safeItemName = itemName || `Listing ${index + 1}`;
    const safePriceLabel = priceLabel || "Price unavailable";
    const itemKey = `${safeItemName}__${safePriceLabel}`;

    return {
      id: rowId || `${seller}::${itemKey}::${index}`,
      rowId: rowId || null,
      seller,
      itemName: safeItemName,
      priceLabel: safePriceLabel,
      priceAmount,
      currencyIconUrl: currencyIcon?.url || null,
      currencyIconAlt: currencyIcon?.alt || null,
      itemKey
    };
  }

  private extractSeller(row: HTMLElement) {
    const sellerLink = row.querySelector<HTMLElement>("span.profile-link a, .profile-link a, .account-name");
    return sellerLink?.textContent?.trim() || null;
  }

  private extractItemName(row: HTMLElement) {
    const candidates = [
      ".itemName",
      ".itemHeader .name",
      ".itemHeader .title",
      ".itemHeader .lprice .title",
      ".details .itemName",
      ".details .title",
      ".details h3",
      ".header .title",
      ".title"
    ];

    for (const selector of candidates) {
      const text = row.querySelector<HTMLElement>(selector)?.textContent?.trim();
      if (text) {
        return text.replace(/\s+/g, " ");
      }
    }

    const detailsText = row.querySelector<HTMLElement>(".details")?.textContent?.replace(/\s+/g, " ").trim();
    if (detailsText) {
      return detailsText.slice(0, 80);
    }

    return null;
  }

  private extractPriceLabel(row: HTMLElement) {
    const priceRoot = row.querySelector<HTMLElement>('[data-field="price"], .price');
    if (!priceRoot) {
      const note = row.querySelector<HTMLElement>(".price-note, .note");
      return note?.textContent?.replace(/\s+/g, " ").trim() || null;
    }

    const text = priceRoot.textContent?.replace(/\s+/g, " ").trim() || "";
    if (!text) return null;

    const normalized = text
      .replace(/^price\s*/i, "")
      .replace(/^asking price\s*/i, "")
      .replace(/asking price/gi, "")
      .replace(/\s*fee.*$/i, "")
      .replace(/^note\s*/i, "")
      .trim();

    return normalized || null;
  }

  private extractPriceAmount(priceLabel: string | null) {
    if (!priceLabel) return null;

    const match = priceLabel.match(/[0-9]+(?:\.[0-9]+)?/);
    return match?.[0] || null;
  }

  private extractCurrencyIcon(row: HTMLElement) {
    const icon = row.querySelector<HTMLImageElement>('[data-field="price"] img, .price img.currency-icon, .price img');
    if (!icon?.src) return null;

    return {
      url: icon.src,
      alt: icon.alt?.trim() || "Currency"
    };
  }

  private resolveRow(itemId: string) {
    const direct = document.querySelector<HTMLElement>(`.row[data-id="${itemId}"], .result-item[data-id="${itemId}"]`);
    if (direct) return direct;

    const currentGroups = this.snapshot();
    const item = currentGroups.flatMap((group) => group.items).find((entry) => entry.id === itemId);
    if (!item) return null;

    return Array.from(document.querySelectorAll<HTMLElement>(RESULT_SELECTOR)).find((row) => {
      const seller = this.extractSeller(row);
      const itemName = this.extractItemName(row);
      const priceLabel = this.extractPriceLabel(row);
      return seller === item.seller && itemName === item.itemName && priceLabel === item.priceLabel;
    }) ?? null;
  }

  private snapshot() {
    let current: BulkSellerGroup[] = [];
    const unsubscribe = this.groupsStore.subscribe((value) => {
      current = value;
    });
    unsubscribe();
    return current;
  }
}

export const bulkSellersService = new BulkSellersService();
