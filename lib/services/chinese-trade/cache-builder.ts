import { shouldRefreshChineseTradeCache } from "./cache-lifecycle"
import {
  chineseTradeStorageFor,
  type ChineseTradeVersion
} from "./contract"
import { convertDeep } from "./simplifier"
import {
  buildLocalizedStatCache,
  buildLocalizedItemCache,
  buildModifierTranslationMap,
  type TradeStatGroup
} from "./stat-cache-transform"
import { loadChineseStatTemplates } from "./stat-templates"

const tradeApi = (origin: string, version: ChineseTradeVersion) =>
  `${origin}/api/${version === "poe2" ? "trade2" : "trade"}/data/`
const CACHE_MAX_AGE_MS = 8 * 60 * 60 * 1000

const readCache = (
  language: "zh-tw" | "zh-cn",
  version: ChineseTradeVersion
): Promise<Record<string, unknown>> =>
  new Promise((resolve) =>
    chrome.storage.local.get(
      (() => {
        const storage = chineseTradeStorageFor(version)
        const active =
          language === "zh-cn"
            ? storage.simplified
            : storage.traditional
        return [
          storage.updatedAt,
          active.stats,
          ...(version === "poe2" ? [active.items] : []),
          active.static,
          active.filters
        ]
      })(),
      (stored) => resolve(stored as Record<string, unknown>)
    )
  )

const writeCache = (payload: Record<string, unknown>): Promise<void> =>
  new Promise((resolve, reject) =>
    chrome.storage.local.set(payload, () => {
      const error = chrome.runtime.lastError
      if (error) {
        reject(new Error(error.message))
        return
      }
      resolve()
    })
  )

/** Keep only the active locale and discard cache formats from older releases. */
const pruneChineseTradeCache = (
  language: "zh-tw" | "zh-cn",
  version: ChineseTradeVersion
): Promise<void> =>
  new Promise((resolve, reject) =>
    chrome.storage.local.remove(
      (() => {
        const storage = chineseTradeStorageFor(version)
        const inactive =
          language === "zh-cn"
            ? storage.traditional
            : storage.simplified
        return [
          inactive.items,
          inactive.stats,
          inactive.modifiers,
          inactive.static,
          inactive.filters
        ]
      })(),
      () => {
        const error = chrome.runtime.lastError
        if (error) reject(new Error(error.message))
        else resolve()
      }
    )
  )

const fetchTradeResult = async (
  url: string
): Promise<TradeStatGroup[] | null> => {
  const response = await fetch(url, { credentials: "omit" })
  if (!response.ok) throw new Error(`${url} -> ${response.status}`)
  const value = await response.json()
  return Array.isArray(value?.result)
    ? (value.result as TradeStatGroup[])
    : null
}

const readSimplifiedItemNames = (): Promise<Record<string, string>> =>
  new Promise((resolve) =>
    chrome.storage.local.get(
      [chineseTradeStorageFor("poe1").simplified.itemNames],
      (stored) =>
        resolve(
          (stored[chineseTradeStorageFor("poe1").simplified.itemNames] as Record<
            string,
            string
          >) || {}
        )
    )
  )

/** Use verified simplified names when an item name differs beyond OpenCC. */
const applySimplifiedMercenaryNames = (
  groups: TradeStatGroup[],
  itemNames: Record<string, string>
) => {
  for (const group of groups) {
    if (group.id !== "mercenary") continue
    for (const entry of group.entries ?? []) {
      const match = entry.text?.match(/^(.+) \(([^()]+)\)$/)
      if (!match) continue
      const normalized = match[2].toLowerCase().replace(/[^a-z0-9]/g, "")
      const replacement = itemNames[normalized]
      if (replacement && replacement !== match[1]) {
        entry.text = `${replacement} (${match[2]})`
      }
    }
  }
}

/**
 * Rebuild the disposable Chinese Trade cache from official metadata and local
 * reviewed dictionaries. Stored ids are never translated, only display text.
 */
export const refreshChineseTradeCache = async (
  force = false,
  language: "zh-tw" | "zh-cn" = "zh-tw",
  version: ChineseTradeVersion = "poe1"
): Promise<boolean> => {
  try {
    const storage = chineseTradeStorageFor(version)
    const cache = await readCache(language, version)
    const active =
      language === "zh-cn"
            ? storage.simplified
            : storage.traditional
    const statsKey = active.stats
    if (
      !force &&
      Array.isArray(cache[statsKey]) &&
      (version === "poe1" || Array.isArray(cache[active.items])) &&
      Array.isArray(cache[active.static]) &&
      Array.isArray(cache[active.filters]) &&
      !shouldRefreshChineseTradeCache(
        Number(cache[storage.updatedAt]) || 0,
        Date.now(),
        CACHE_MAX_AGE_MS
      )
    ) {
      await pruneChineseTradeCache(language, version)
      return true
    }

    const [
      taiwanStats,
      internationalStats,
      templates,
      taiwanStatic,
      taiwanFilters,
      taiwanItems,
      internationalItems
    ] = await Promise.all([
      fetchTradeResult(`${tradeApi("https://pathofexile.tw", version)}stats`),
      fetchTradeResult(`${tradeApi("https://www.pathofexile.com", version)}stats`).catch(() => null),
      version === "poe1" ? loadChineseStatTemplates() : Promise.resolve({}),
      fetchTradeResult(`${tradeApi("https://pathofexile.tw", version)}static`).catch(() => null),
      fetchTradeResult(`${tradeApi("https://pathofexile.tw", version)}filters`).catch(() => null),
      version === "poe2"
        ? fetchTradeResult(`${tradeApi("https://pathofexile.tw", version)}items`).catch(() => null)
        : Promise.resolve(null),
      version === "poe2"
        ? fetchTradeResult(`${tradeApi("https://www.pathofexile.com", version)}items`).catch(() => null)
        : Promise.resolve(null)
    ])
    if (!taiwanStats) {
      throw new Error("Taiwan Trade returned no stat data")
    }

    const localizedStats =
      language === "zh-cn"
        ? convertDeep(
            buildLocalizedStatCache(
              taiwanStats,
              internationalStats,
              templates,
              "cn"
            )
          )
        : buildLocalizedStatCache(
            taiwanStats,
            internationalStats,
            templates,
            "tw"
          )
    if (language === "zh-cn" && version === "poe1") {
      applySimplifiedMercenaryNames(
        localizedStats,
        await readSimplifiedItemNames()
      )
    }

    const modifiers = buildModifierTranslationMap(
      taiwanStats,
      internationalStats
    )
    const modifierKey =
      language === "zh-cn"
        ? storage.simplified.modifiers
        : storage.traditional.modifiers
    const staticKey =
      language === "zh-cn"
        ? storage.simplified.static
        : storage.traditional.static
    const filtersKey =
      language === "zh-cn"
        ? storage.simplified.filters
        : storage.traditional.filters

    const payload: Record<string, unknown> = {
      [storage.updatedAt]: Date.now(),
      [statsKey]: localizedStats,
      [modifierKey]: language === "zh-cn" ? convertDeep(modifiers) : modifiers
    }
    if (taiwanItems && internationalItems) {
      payload[active.items] =
        language === "zh-cn"
          ? convertDeep(buildLocalizedItemCache(taiwanItems, internationalItems, "cn"))
          : buildLocalizedItemCache(taiwanItems, internationalItems, "tw")
    }
    if (taiwanStatic) {
      payload[staticKey] =
        language === "zh-cn" ? convertDeep(taiwanStatic) : taiwanStatic
    }
    if (taiwanFilters) {
      payload[filtersKey] =
        language === "zh-cn" ? convertDeep(taiwanFilters) : taiwanFilters
    }

    await pruneChineseTradeCache(language, version)
    await writeCache(payload)
    return true
  } catch (error) {
    console.error(
      "[PoeTradePlus] Failed to refresh the Chinese Trade cache",
      error
    )
    throw error
  }
}
