// Bulk sellers — groups result rows by seller and exposes the aggregation to
// the Svelte sidebar. Lives as a feature with an explicit start()/stop()
// lifecycle so the sidebar can mount and unmount it without leaving the
// tradeDomObserver subscription or document click listener behind.

import { get, writable } from "svelte/store"

import { createFeatureLifecycle, type FeatureLifecycle } from "../core/feature-lifecycle"
import { tradeDomObserver } from "../core/trade-dom-observer"
import { tradeDom } from "../site-adapter/trade-dom"
import {
  bulkSellerRows,
  directBuyButton,
  itemDetails,
  itemPrice,
  itemPriceIcon,
  itemTitleCandidates,
  priceNote,
  searchButton,
  sellerName
} from "../site-adapter/selectors/common"
import type { BulkSellerGroup, BulkSellerItem } from "../types/bulk-sellers"
import { languageStore, translate } from "./i18n"

const HIGHLIGHT_CLASS = "bt-bulk-seller-glow"
const POST_SEARCH_REFRESH_DELAYS = [80, 220, 500, 900]

export interface BulkSellersFeature extends FeatureLifecycle {
  subscribe(callback: (groups: BulkSellerGroup[]) => void): () => void
  find(itemId: string): boolean
  buy(itemId: string): boolean
  refresh(): void
}

export const createBulkSellers = (): BulkSellersFeature => {
  const groupsStore = writable<BulkSellerGroup[]>([])
  const rowCache = new Map<string, { signature: string; item: BulkSellerItem | null }>()
  const searchRefreshTimers: number[] = []
  let unsubscribeObserver: (() => void) | null = null

  const extractSeller = (row: HTMLElement) => {
    const sellerLink = row.querySelector<HTMLElement>(sellerName)
    return sellerLink?.textContent?.trim() || null
  }

  const cleanListingText = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .replace(/\bAsking Price:\s*/i, "")
      .replace(/\bFee:\s*[\d.,]+\s*[a-z%]*\b/gi, "")
      .replace(/\bAcc:\s*[^\s]+/i, "")
      .replace(
        /\blisted\s+\d+\s+(?:minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago\b/i,
        ""
      )
      .replace(/\b(?:price|note)\b.*$/i, "")
      .trim()
      .replace(/\s{2,}/g, " ")

  const extractItemName = (row: HTMLElement) => {
    for (const selector of itemTitleCandidates) {
      const text = row.querySelector<HTMLElement>(selector)?.textContent?.trim()
      if (text) {
        return text.replace(/\s+/g, " ")
      }
    }

    const detailsText = row
      .querySelector<HTMLElement>(itemDetails)
      ?.textContent?.replace(/\s+/g, " ")
      .trim()
    if (detailsText) {
      return cleanListingText(detailsText)
    }

    return null
  }

  const extractPriceLabel = (row: HTMLElement) => {
    const priceRoot = row.querySelector<HTMLElement>(itemPrice)
    if (!priceRoot) {
      const note = row.querySelector<HTMLElement>(priceNote)
      return note?.textContent?.replace(/\s+/g, " ").trim() || null
    }

    const text = priceRoot.textContent?.replace(/\s+/g, " ").trim() || ""
    if (!text) return null

    return (
      text
        .replace(/^price\s*/i, "")
        .replace(/^asking price\s*/i, "")
        .replace(/asking price/gi, "")
        .replace(/\s*fee.*$/i, "")
        .replace(/^note\s*/i, "")
        .trim() || null
    )
  }

  const extractPriceAmount = (priceLabel: string | null) => {
    if (!priceLabel) return null
    const match = priceLabel.match(/[0-9]+(?:\.[0-9]+)?/)
    return match?.[0] || null
  }

  const extractCurrencyIcon = (row: HTMLElement) => {
    const icon = row.querySelector<HTMLImageElement>(itemPriceIcon)
    if (!icon?.src) return null
    return {
      url: icon.src,
      alt: icon.alt?.trim() || "Currency"
    }
  }

  const getRowSignature = (row: HTMLElement) =>
    [
      row.dataset.id || row.getAttribute("data-id") || "",
      row.className,
      row.textContent?.replace(/\s+/g, " ").trim() || ""
    ].join("::")

  const extractItemUncached = (
    row: HTMLElement,
    index: number
  ): BulkSellerItem | null => {
    const seller = extractSeller(row)
    const itemName = extractItemName(row)
    const priceLabel = extractPriceLabel(row)
    const priceAmount = extractPriceAmount(priceLabel)
    const currencyIcon = extractCurrencyIcon(row)
    const rowId = row.dataset.id || row.getAttribute("data-id")

    if (!seller) return null

    const language = get(languageStore)
    const safeItemName =
      itemName || translate(language, "bulk.listingFallback", { index: index + 1 })
    const safePriceLabel = priceLabel || translate(language, "bulk.priceUnavailable")
    const itemKey = `${safeItemName}__${safePriceLabel}`

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
    }
  }

  const extractItem = (row: HTMLElement, index: number): BulkSellerItem | null => {
    const rowId = row.dataset.id || row.getAttribute("data-id")
    if (rowId) {
      const signature = getRowSignature(row)
      const cached = rowCache.get(rowId)
      if (cached && cached.signature === signature) {
        return cached.item
      }

      const item = extractItemUncached(row, index)
      rowCache.set(rowId, { signature, item })
      return item
    }

    return extractItemUncached(row, index)
  }

  const collectGroups = (): BulkSellerGroup[] => {
    const rows = tradeDom.getBulkSellerRows()
    const sellers = new Map<string, BulkSellerItem[]>()

    rows.forEach((row, index) => {
      const item = extractItem(row, index)
      if (!item) return
      const existing = sellers.get(item.seller) ?? []
      existing.push(item)
      sellers.set(item.seller, existing)
    })

    return Array.from(sellers.entries())
      .map(([seller, items]) => ({
        seller,
        total: items.length,
        items: items.sort((a, b) => a.itemName.localeCompare(b.itemName))
      }))
      .filter((group) => group.total > 1)
      .sort((a, b) => b.total - a.total || a.seller.localeCompare(b.seller))
  }

  const snapshot = () => {
    let current: BulkSellerGroup[] = []
    const unsubscribe = groupsStore.subscribe((value) => {
      current = value
    })
    unsubscribe()
    return current
  }

  const resolveRow = (itemId: string) => {
    const direct = tradeDom.findRowById(itemId)
    if (direct) return direct

    const currentGroups = snapshot()
    const item = currentGroups
      .flatMap((group) => group.items)
      .find((entry) => entry.id === itemId)
    if (!item) return null

    return (
      tradeDom.getBulkSellerRows().find((row) => {
        const seller = extractSeller(row)
        const itemName = extractItemName(row)
        const priceLabel = extractPriceLabel(row)
        return (
          seller === item.seller &&
          itemName === item.itemName &&
          priceLabel === item.priceLabel
        )
      }) ?? null
    )
  }

  const refresh = () => {
    groupsStore.set(collectGroups())
  }

  const find = (itemId: string) => {
    const row = resolveRow(itemId)
    if (!row) return false
    row.scrollIntoView({ block: "center", behavior: "smooth" })
    row.classList.add(HIGHLIGHT_CLASS)
    window.setTimeout(() => row.classList.remove(HIGHLIGHT_CLASS), 1800)
    return true
  }

  const buy = (itemId: string) => {
    const row = resolveRow(itemId)
    if (!row) return false
    const button = row.querySelector<HTMLElement>(directBuyButton)
    if (!button) return false
    button.click()
    return true
  }

  const schedulePostSearchRefresh = () => {
    searchRefreshTimers.forEach((timer) => window.clearTimeout(timer))
    searchRefreshTimers.length = 0
    for (const delay of POST_SEARCH_REFRESH_DELAYS) {
      searchRefreshTimers.push(window.setTimeout(() => refresh(), delay))
    }
  }

  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Element | null
    if (!target?.closest(searchButton)) return
    schedulePostSearchRefresh()
  }

  const feature = createFeatureLifecycle("bulk-sellers", () => {
    const stops: Array<() => void> = []

    if (
      typeof window === "undefined" ||
      window.location.protocol === "chrome-extension:"
    ) {
      return () => {}
    }

    unsubscribeObserver = tradeDomObserver.subscribe({
      id: "bulk-sellers",
      selector: bulkSellerRows,
      debounceMs: 120,
      handler: () => refresh()
    })
    stops.push(() => {
      unsubscribeObserver?.()
      unsubscribeObserver = null
    })

    document.addEventListener("click", handleDocumentClick, true)
    stops.push(() => document.removeEventListener("click", handleDocumentClick, true))

    refresh()

    return () => {
      stops.forEach((stop) => stop())
      searchRefreshTimers.forEach((timer) => window.clearTimeout(timer))
      searchRefreshTimers.length = 0
      rowCache.clear()
      groupsStore.set([])
    }
  })

  return {
    ...feature,
    subscribe: groupsStore.subscribe,
    find,
    buy,
    refresh
  }
}

export const bulkSellers = createBulkSellers()
