// Document-level delegation helpers shared by content features running in the
// MAIN world on the Trade site.

import {
  bulkSellerRows,
  filterProperty,
  itemResultRows,
  quickFiltersPane,
  statsTitles
} from "./selectors/common.ts"
import { poe2CopyButton } from "./selectors/poe2.ts"

const escapeCssAttributeValue = (value: string) => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value)
  }

  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

export const on = (
  type: string,
  selector: string,
  handler: Function,
  opts?: any
) => {
  const listener = (e: any) => {
    const el = e.target.closest(selector)
    if (!el) return
    handler.call(el, e, el)
  }
  document.addEventListener(type, listener, opts)
  return () => document.removeEventListener(type, listener, opts)
}

export const onEnter = (selector: string, handler: Function) => {
  const listener = (e: any) => {
    const el = e.target.closest(selector)
    if (!el) return
    const rt = e.relatedTarget
    if (rt && (rt === el || el.contains(rt))) return
    handler.call(el, e, el)
  }
  document.addEventListener("mouseover", listener)
  return () => document.removeEventListener("mouseover", listener)
}

// Semantic accessors for the Trade Site's own DOM. Features should never reach
// for `document.querySelector(...)` when the selector is internal to the GGG
// site — call into `tradeDom` instead so a layout change can be fixed in one
// place.

const rowByIdSelector = (itemId: string) => {
  const escaped = escapeCssAttributeValue(itemId)
  return `.row[data-id="${escaped}"], .result-item[data-id="${escaped}"]`
}

export const tradeDom = {
  // Bulk sellers — every row participating in the bulk-seller aggregation.
  getBulkSellerRows(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(bulkSellerRows)
    )
  },

  // Resolve a buyer-side row (or sidebar batch) by its item id, returning
  // null when the page does not show the row yet.
  findRowById(itemId: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(rowByIdSelector(itemId))
  },

  // Item results — every row rendered inside the search results panel.
  getItemResultRows(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(itemResultRows)
    )
  },

  // Quick filters and the broader search panel.
  getQuickFiltersPane(): HTMLElement | null {
    return document.querySelector<HTMLElement>(quickFiltersPane)
  },

  getStatsTitles(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(statsTitles)
    )
  },

  // Read a named input value from the search panel. Returns null when the
  // input is missing, empty, or holds the placeholder value.
  readInputValue(selector: string, nullValue?: string): string | null {
    const input = document.querySelector(selector) as HTMLInputElement | null
    if (!input) return null
    const value = input.value
    if (!value || (nullValue && value === nullValue)) return null
    return value
  },

  // PoE2-only copy buttons beside result rows.
  getPoe2CopyButtons(): HTMLButtonElement[] {
    return Array.from(
      document.querySelectorAll<HTMLButtonElement>(poe2CopyButton)
    )
  },

  // Every filter-property row in the search panel (used by Buyout Currency
  // and other features that need to walk the filter list).
  getFilterProperties(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(filterProperty)
    )
  }
}
