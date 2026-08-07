import { tradeHosts } from "~/lib/config/trade-hosts"
import {
  chineseTradeMessage,
  chineseTradePageStorageFor,
  chineseTradeStorageFor
} from "~/lib/services/chinese-trade/contract"
import { getTradeTranslationState } from "~/lib/services/trade-translation"

const tradeCacheKeysFor = (version: "poe1" | "poe2") =>
  version === "poe2"
    ? [
        "lscache-trade2stats",
        "lscache-trade2data",
        "lscache-trade2filters",
        "lscache-trade2items"
      ]
    : [
        "lscache-tradestats",
        "lscache-tradedata",
        "lscache-tradefilters",
        "lscache-tradeitems"
      ]

const removeTranslatedTradeCache = (version: "poe1" | "poe2") => {
  const pageStorage = chineseTradePageStorageFor(version)
  if (!localStorage.getItem(pageStorage.injected)) return
  for (const key of tradeCacheKeysFor(version)) {
    localStorage.removeItem(key)
    localStorage.removeItem(`${key}-cacheexpiration`)
  }
  localStorage.removeItem(pageStorage.injected)
}

const storageValues = (keys: string[]) =>
  new Promise<Record<string, unknown>>((resolve) =>
    chrome.storage.local.get(keys, (values) =>
      resolve(values as Record<string, unknown>)
    )
  )

const requestCacheBuild = (version: "poe1" | "poe2") =>
  new Promise<boolean>((resolve) => {
    chrome.runtime.sendMessage(
      { type: chineseTradeMessage.rebuildCache, version },
      (reply) => resolve(reply?.ok === true)
    )
  })

/**
 * Supplies localized metadata before Trade initializes its own lscache entries.
 * The page keeps official ids while displaying the Chinese labels from the
 * extension cache.
 */
export default defineContentScript({
  matches: tradeHosts,
  runAt: "document_start",

  async main() {
    const state = await getTradeTranslationState()
    if (!state.enabled) {
      try {
        removeTranslatedTradeCache(state.version)
      } catch {
        // Page storage can be unavailable during browser shutdown.
      }
      return
    }

    const storage = chineseTradeStorageFor(state.version)
    const pageStorage = chineseTradePageStorageFor(state.version)
    const locale =
      state.language === "zh-cn"
        ? storage.simplified
        : storage.traditional
    const targets: Array<[string, string]> = [
      [locale.stats, state.version === "poe2" ? "lscache-trade2stats" : "lscache-tradestats"],
      [locale.static, state.version === "poe2" ? "lscache-trade2data" : "lscache-tradedata"],
      [locale.filters, state.version === "poe2" ? "lscache-trade2filters" : "lscache-tradefilters"]
    ]
    if (state.version === "poe2") targets.push([locale.items, "lscache-trade2items"])

    let values: Record<string, unknown>
    try {
      values = await storageValues(targets.map(([source]) => source))
    } catch {
      return
    }

    const serialized = new Map<string, string>()
    for (const [source, target] of targets) {
      const value = values[source]
      if (!Array.isArray(value)) continue
      try {
        serialized.set(target, JSON.stringify(value))
      } catch {
        // Skip malformed data and let the native site fetch its own value.
      }
    }

    const stats = serialized.get(
      state.version === "poe2" ? "lscache-trade2stats" : "lscache-tradestats"
    )
    const isComplete = targets.every(([, target]) => serialized.has(target))
    if (!stats || !isComplete) {
      try {
        if (
          sessionStorage.getItem(pageStorage.rebuildGuard) === "1"
        )
          return
        sessionStorage.setItem(pageStorage.rebuildGuard, "1")
        if (await requestCacheBuild(state.version)) location.reload()
      } catch {
        // No cache build is better than an interrupted Trade page.
      }
      return
    }
    sessionStorage.removeItem(pageStorage.rebuildGuard)

    const bootCache = new Map(
      targets.map(([, target]) => [target, localStorage.getItem(target)])
    )
    const inject = () => {
      let wroteValue = false
      for (const [target, value] of serialized) {
        if (localStorage.getItem(target) !== value)
          localStorage.setItem(target, value)
        localStorage.removeItem(`${target}-cacheexpiration`)
        wroteValue = true
      }
      if (wroteValue)
        localStorage.setItem(pageStorage.injected, "1")
    }

    try {
      inject()
      ;[80, 240, 600].forEach((delay) => setTimeout(inject, delay))
      const changedAtBoot = [...serialized].some(
        ([target, value]) => bootCache.get(target) !== value
      )
      if (
        changedAtBoot &&
        sessionStorage.getItem(pageStorage.reloadGuard) !== "1"
      ) {
        sessionStorage.setItem(pageStorage.reloadGuard, "1")
        setTimeout(() => location.reload(), 50)
      } else if (!changedAtBoot) {
        sessionStorage.removeItem(pageStorage.reloadGuard)
      }
    } catch {
      // The native Trade cache remains available if page storage rejects writes.
    }
  }
})
