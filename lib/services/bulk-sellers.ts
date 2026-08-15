import { writable } from "svelte/store";
import { get } from "svelte/store";
import { languageStore, translate } from "./i18n";
import {
  directBuyButton,
  itemDetails,
  itemPrice,
  itemPriceIcon,
  itemTitleCandidates,
  priceNote,
  searchButton,
  sellerName
} from "../site-adapter/selectors/common";
import { tradeDom } from "../site-adapter/trade-dom";
import { tradeDomObserver } from "../core/trade-dom-observer";
import type { BulkSellerGroup, BulkSellerItem } from "../types/bulk-sellers";

const HIGHLIGHT_CLASS = "bt-bulk-seller-glow";

export class BulkSellersService {
  private readonly groupsStore = writable<BulkSellerGroup[]>([]);
  public subscribe = this.groupsStore.subscribe;
  private unsubscribeObserver: (() => void) | null = null;
  private initialized = false;
  private readonly postSearchRefreshDelays = [80, 220, 500, 900];
  private searchRefreshTimers: number[] = [];
  private readonly rowCache = new Map<string, { signature: string; item: BulkSellerItem | null }>();
  private readonly handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target?.closest(searchButton)) return;
    this.schedulePostSearchRefresh();
  };

  initialize() {
    if (this.initialized || typeof window === "undefined" || window.location.protocol === "chrome-extension:") {
      return;
    }

    this.initialized = true;
    this.startObserving();
    document.addEventListener("click", this.handleDocumentClick, true);
  }

  teardown() {
    this.initialized = false;
    this.searchRefreshTimers.forEach((timer) => window.clearTimeout(timer));
    this.searchRefreshTimers = [];
    this.unsubscribeObserver?.();
    this.unsubscribeObserver = null;
    this.rowCache.clear();
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

    const button = row.querySelector<HTMLElement>(directBuyButton);
    if (!button) return false;

    button.click();
    return true;
  }

  private startObserving() {
    this.unsubscribeObserver?.();
    this.unsubscribeObserver = tradeDomObserver.subscribe({
      id: "bulk-sellers",
      debounceMs: 120,
      handler: () => this.refresh()
    });
  }

  private schedulePostSearchRefresh() {
    this.searchRefreshTimers.forEach((timer) => window.clearTimeout(timer));
    this.searchRefreshTimers = this.postSearchRefreshDelays.map((delay) =>
      window.setTimeout(() => this.refresh(), delay)
    );
  }

  private collectGroups() {
    const rows = tradeDom.getBulkSellerRows();
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
    const rowId = row.dataset.id || row.getAttribute("data-id");
    if (rowId) {
      const signature = this.getRowSignature(row);
      const cached = this.rowCache.get(rowId);

      if (cached && cached.signature === signature) {
        return cached.item;
      }

      const item = this.extractItemUncached(row, index);
      this.rowCache.set(rowId, { signature, item });
      return item;
    }

    return this.extractItemUncached(row, index);
  }

  private extractItemUncached(row: HTMLElement, index: number): BulkSellerItem | null {
    const seller = this.extractSeller(row);
    const itemName = this.extractItemName(row);
    const priceLabel = this.extractPriceLabel(row);
    const priceAmount = this.extractPriceAmount(priceLabel);
    const currencyIcon = this.extractCurrencyIcon(row);
    const rowId = row.dataset.id || row.getAttribute("data-id");

    if (!seller) {
      return null;
    }

    const language = get(languageStore);
    const safeItemName = itemName || translate(language, "bulk.listingFallback", { index: index + 1 });
    const safePriceLabel = priceLabel || translate(language, "bulk.priceUnavailable");
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

  private getRowSignature(row: HTMLElement) {
    return [
      row.dataset.id || row.getAttribute("data-id") || "",
      row.className,
      row.textContent?.replace(/\s+/g, " ").trim() || ""
    ].join("::");
  }

  private extractSeller(row: HTMLElement) {
    const sellerLink = row.querySelector<HTMLElement>(sellerName);
    return sellerLink?.textContent?.trim() || null;
  }

  private extractItemName(row: HTMLElement) {
    for (const selector of itemTitleCandidates) {
      const text = row.querySelector<HTMLElement>(selector)?.textContent?.trim();
      if (text) {
        return text.replace(/\s+/g, " ");
      }
    }

    const detailsText = row.querySelector<HTMLElement>(itemDetails)?.textContent?.replace(/\s+/g, " ").trim();
    if (detailsText) {
      return this.cleanListingText(detailsText);
    }

    return null;
  }

  private cleanListingText(text: string) {
    return text
      .replace(/\s+/g, " ")
      .replace(/\bAsking Price:\s*/i, "")
      .replace(/\bFee:\s*[\d.,]+\s*[a-z%]*\b/gi, "")
      .replace(/\bAcc:\s*[^\s]+/i, "")
      .replace(/\blisted\s+\d+\s+(?:minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago\b/i, "")
      .replace(/\b(?:price|note)\b.*$/i, "")
      .trim()
      .replace(/\s{2,}/g, " ");
  }

  private extractPriceLabel(row: HTMLElement) {
    const priceRoot = row.querySelector<HTMLElement>(itemPrice);
    if (!priceRoot) {
      const note = row.querySelector<HTMLElement>(priceNote);
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
    const icon = row.querySelector<HTMLImageElement>(itemPriceIcon);
    if (!icon?.src) return null;

    return {
      url: icon.src,
      alt: icon.alt?.trim() || "Currency"
    };
  }

  private resolveRow(itemId: string) {
    const direct = tradeDom.findRowById(itemId);
    if (direct) return direct;

    const currentGroups = this.snapshot();
    const item = currentGroups.flatMap((group) => group.items).find((entry) => entry.id === itemId);
    if (!item) return null;

    return tradeDom.getBulkSellerRows().find((row) => {
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
