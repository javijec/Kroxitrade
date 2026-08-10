/**
 * Internal contract for the optional Chinese localization of the Trade sites.
 *
 * These keys belong to PoeTradePlus only. Cached data is disposable and is
 * rebuilt from bundled dictionaries plus the official Trade endpoints.
 */
export const chineseTradeStorage = {
  updatedAt: "poeTradePlus.chineseTrade.updatedAt",
  itemNamesUpdatedAt: "poeTradePlus.chineseTrade.itemNamesUpdatedAt",
  traditional: {
    stats: "poeTradePlus.chineseTrade.traditional.stats",
    modifiers: "poeTradePlus.chineseTrade.traditional.modifiers",
    static: "poeTradePlus.chineseTrade.traditional.static",
    filters: "poeTradePlus.chineseTrade.traditional.filters",
    items: "poeTradePlus.chineseTrade.traditional.items",
    itemNames: "poeTradePlus.chineseTrade.traditional.itemNames",
    reverseNames: "poeTradePlus.chineseTrade.traditional.reverseNames"
  },
  simplified: {
    stats: "poeTradePlus.chineseTrade.simplified.stats",
    modifiers: "poeTradePlus.chineseTrade.simplified.modifiers",
    static: "poeTradePlus.chineseTrade.simplified.static",
    filters: "poeTradePlus.chineseTrade.simplified.filters",
    items: "poeTradePlus.chineseTrade.simplified.items",
    itemNames: "poeTradePlus.chineseTrade.simplified.itemNames",
    reverseNames: "poeTradePlus.chineseTrade.simplified.reverseNames"
  }
} as const

export type ChineseTradeVersion = "poe1" | "poe2"

type ChineseTradeLocaleStorage = {
  stats: string
  modifiers: string
  static: string
  filters: string
  items: string
  itemNames: string
  reverseNames: string
}

const localizedStorage = (
  prefix: string,
  locale: "traditional" | "simplified"
): ChineseTradeLocaleStorage => ({
  stats: `${prefix}.${locale}.stats`,
  modifiers: `${prefix}.${locale}.modifiers`,
  static: `${prefix}.${locale}.static`,
  filters: `${prefix}.${locale}.filters`,
  items: `${prefix}.${locale}.items`,
  itemNames: `${prefix}.${locale}.itemNames`,
  reverseNames: `${prefix}.${locale}.reverseNames`
})

/** Version-scoped keys prevent a PoE1 snapshot being injected into Trade2. */
export const chineseTradeStorageFor = (version: ChineseTradeVersion) => {
  if (version === "poe1") return chineseTradeStorage
  const prefix = "poeTradePlus.chineseTrade2"
  return {
    updatedAt: `${prefix}.updatedAt`,
    itemNamesUpdatedAt: `${prefix}.itemNamesUpdatedAt`,
    traditional: localizedStorage(prefix, "traditional"),
    simplified: localizedStorage(prefix, "simplified")
  } as const
}

export const chineseTradePageStorage = {
  injected: "poeTradePlus.chineseTrade.injected",
  reloadGuard: "poeTradePlus.chineseTrade.reloaded",
  rebuildGuard: "poeTradePlus.chineseTrade.rebuildRequested"
} as const

export const chineseTradePageStorageFor = (version: ChineseTradeVersion) =>
  version === "poe1"
    ? chineseTradePageStorage
    : {
        injected: "poeTradePlus.chineseTrade2.injected",
        reloadGuard: "poeTradePlus.chineseTrade2.reloaded",
        rebuildGuard: "poeTradePlus.chineseTrade2.rebuildRequested"
      }

export const chineseTradeMessage = {
  rebuildCache: "poeTradePlus.chineseTrade.rebuildCache",
  getTemplates: "poeTradePlus.chineseTrade.getTemplates",
  reloadTradeTabs: "poeTradePlus.chineseTrade.reloadTradeTabs"
} as const
