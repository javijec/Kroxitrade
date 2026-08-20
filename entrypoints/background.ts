import { registerBackgroundHandlers } from "~/lib/background"
import { refreshChineseTradeCache } from "~/lib/services/chinese-trade/cache-builder"
import { chineseTradeMessage } from "~/lib/services/chinese-trade/contract"
import type { ChineseTradeVersion } from "~/lib/services/chinese-trade/contract"
import { buildChineseItemNameCache } from "~/lib/services/chinese-trade/item-name-cache"
import { loadChineseStatTemplates } from "~/lib/services/chinese-trade/stat-templates"
import { getTradeTranslationState } from "~/lib/services/trade-translation"
import { storageService } from "~/lib/services/storage"
import { bookmarksService } from "~/lib/services/bookmarks"
import { flushSyncJournal } from "~/lib/services/sync-journal"
import {
  BOOKMARK_SCROLL_RESTORE_MAX_AGE_MS,
  bookmarkScrollMessage,
  getBookmarkScrollRestoreKey
} from "~/lib/services/bookmark-scroll"
import {
  ACTIVE_BOOKMARK_RESTORE_MAX_AGE_MS,
  activeBookmarkMessage,
  getActiveBookmarkTabKey
} from "~/lib/services/active-bookmark"
import { tabsCreateMessage } from "~/lib/services/active-trade-tab"

const getStorageUsage = async () => {
  const measure = async (
    area:
      | (chrome.storage.StorageArea & {
          QUOTA_BYTES?: number
          QUOTA_BYTES_PER_ITEM?: number
        })
      | undefined
  ) => {
    if (!area) return { available: false }
    try {
      const usedBytes = await area.getBytesInUse(null)
      return {
        available: true,
        usedBytes,
        quotaBytes: area.QUOTA_BYTES,
        quotaBytesPerItem: area.QUOTA_BYTES_PER_ITEM
      }
    } catch (error) {
      return {
        available: false,
        error: getErrorMessage(error)
      }
    }
  }

  const [local, sync, session, managed] = await Promise.all([
    measure(chrome.storage.local),
    measure(chrome.storage.sync),
    measure(chrome.storage.session),
    measure(chrome.storage.managed)
  ])
  return { local, sync, session, managed }
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const BOOKMARK_REPOSITORY_FLUSH_ALARM = "bookmark-repository-flush"
const BOOKMARK_REPOSITORY_RECOVERY_DELAY_MS = 30_000
let bookmarkFlushTimer: ReturnType<typeof setTimeout> | null = null

const flushPendingLocalChanges = () =>
  Promise.all([
    bookmarksService.flushPendingOperations({ reloadJournal: true }),
    flushSyncJournal()
  ]).then(() => undefined)

const scheduleBookmarkFlush = (delayMs = 500) => {
  if (bookmarkFlushTimer) clearTimeout(bookmarkFlushTimer)
  bookmarkFlushTimer = setTimeout(() => {
    bookmarkFlushTimer = null
    void flushPendingLocalChanges().catch((error) => {
      console.warn("[PoeTradePlus] Could not flush pending local changes", error)
    })
  }, Math.max(0, delayMs))

  // Chrome alarms are deliberately coarse. They are a durable recovery path
  // if the MV3 worker is suspended before the short in-memory debounce fires.
  chrome.alarms.create(BOOKMARK_REPOSITORY_FLUSH_ALARM, {
    when: Date.now() + BOOKMARK_REPOSITORY_RECOVERY_DELAY_MS
  })
}

const prepareChineseTradeCaches = async (
  force = false,
  requestedLanguage?: unknown,
  requestedVersion?: unknown
) => {
  const state = await getTradeTranslationState()
  const language =
    requestedLanguage === "zh-cn" || requestedLanguage === "zh-tw"
      ? requestedLanguage
      : state.language
  if (language !== "zh-cn" && language !== "zh-tw") return
  if (!force && !state.enabled) return
  const version: ChineseTradeVersion =
    requestedVersion === "poe1" || requestedVersion === "poe2"
      ? requestedVersion
      : state.version
  const [cacheReady] = await Promise.all([
    refreshChineseTradeCache(force, language, version),
    version === "poe1"
      ? buildChineseItemNameCache(force, language)
      : Promise.resolve()
  ])
  if (!cacheReady) throw new Error("Chinese Trade cache could not be prepared")
}

const isInternationalTrade = (url: URL) =>
  /^(?:(?:www|br|ru|th|de|fr|es|jp)\.)?pathofexile\.com$/i.test(
    url.hostname
  )

const isTaiwanTrade = (url: URL) => url.hostname === "pathofexile.tw"

const isTradeVersion = (
  url: string | undefined,
  version: ChineseTradeVersion
) => {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const tradePath = version === "poe2" ? "/trade2" : "/trade"
    return (
      (isInternationalTrade(parsed) || isTaiwanTrade(parsed)) &&
      (parsed.pathname === tradePath ||
        parsed.pathname.startsWith(`${tradePath}/`))
    )
  } catch {
    return false
  }
}

const reloadTranslatedTradeTabs = async (version: ChineseTradeVersion) => {
  const tabs = await chrome.tabs.query({})
  await Promise.all(
    tabs
      .filter(
        (tab) =>
          typeof tab.id === "number" &&
          isTradeVersion(tab.url, version)
      )
      .map(async (tab) => {
        const tabId = tab.id
        if (typeof tabId !== "number") return
        try {
          await chrome.tabs.reload(tabId)
        } catch {
          // A tab may close or navigate while the reload is being scheduled.
        }
      })
  )
}

export default defineBackground({
  type: "module",
  main() {
    storageService.initializeSyncRecovery()
    registerBackgroundHandlers()
    scheduleBookmarkFlush()
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name !== BOOKMARK_REPOSITORY_FLUSH_ALARM) return
      void flushPendingLocalChanges().catch((error) => {
        console.warn("[PoeTradePlus] Could not flush pending local changes", error)
      })
    })
    void prepareChineseTradeCaches()
    chrome.runtime.onInstalled.addListener(() => {
      void prepareChineseTradeCaches()
    })
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const tabId = sender.tab?.id
      const bookmarkScrollKey =
        typeof tabId === "number" ? getBookmarkScrollRestoreKey(tabId) : null

      if (request?.type === "open-url-in-new-window") {
        if (typeof request.url !== "string") {
          sendResponse({ ok: false })
          return false
        }
        let url: URL
        try {
          url = new URL(request.url)
        } catch {
          sendResponse({ ok: false })
          return false
        }
        if (!/^https:$/.test(url.protocol)) {
          sendResponse({ ok: false })
          return false
        }
        chrome.windows
          .create({ url: url.href, type: "normal", focused: true })
          .then(() => sendResponse({ ok: true }))
          .catch((error) => {
            console.warn("[Poe Trade Plus] Failed to open a new window", error)
            sendResponse({ ok: false })
          })
        return true
      }

      if (request?.type === "bookmark-repository-flush") {
        if (request.awaitCompletion === true) {
          flushPendingLocalChanges()
            .then(() => sendResponse({ ok: true }))
            .catch((error) =>
              sendResponse({ ok: false, error: getErrorMessage(error) })
            )
          return true
        }
        scheduleBookmarkFlush(
          typeof request.delayMs === "number" ? request.delayMs : 500
        )
        sendResponse({ ok: true })
        return false
      }

      if (request?.type === "sync-journal-flush") {
        scheduleBookmarkFlush(
          typeof request.delayMs === "number" ? request.delayMs : 500
        )
        sendResponse({ ok: true })
        return false
      }

      if (request?.type === tabsCreateMessage.create) {
        const url = request.url
        const active = request.active === true
        const bookmarkId =
          typeof request.bookmarkId === "string" ? request.bookmarkId : ""
        const scrollTop =
          typeof request.scrollTop === "number" &&
          Number.isFinite(request.scrollTop) &&
          request.scrollTop >= 0
            ? request.scrollTop
            : null
        if (typeof url !== "string" || !url) {
          sendResponse({ ok: false })
          return false
        }

        chrome.tabs
          .create({ url, active })
          .then(async (tab) => {
            if (typeof tab.id === "number") {
              if (bookmarkId) {
                await storageService.setValue(getActiveBookmarkTabKey(tab.id), {
                  id: bookmarkId,
                  savedAt: Date.now()
                })
              }
              if (scrollTop !== null) {
                await storageService.setValue(getBookmarkScrollRestoreKey(tab.id), {
                  top: scrollTop,
                  savedAt: Date.now()
                })
              }
            }
            sendResponse({ ok: true })
          })
          .catch(() => sendResponse({ ok: false }))
        return true
      }

      if (request?.type === activeBookmarkMessage.save) {
        const activeTabId =
          typeof request.tabId === "number" ? request.tabId : sender.tab?.id
        const value = request.value
        if (
          typeof activeTabId !== "number" ||
          typeof value?.id !== "string" ||
          !value.id ||
          typeof value.savedAt !== "number"
        ) {
          sendResponse({ ok: false })
          return false
        }

        storageService
          .setValue(getActiveBookmarkTabKey(activeTabId), {
            id: value.id,
            savedAt: value.savedAt
          })
          .then((ok) => sendResponse({ ok }))
          .catch(() => sendResponse({ ok: false }))
        return true
      }

      if (request?.type === activeBookmarkMessage.consume) {
        const activeBookmarkKey =
          typeof tabId === "number" ? getActiveBookmarkTabKey(tabId) : null
        if (!activeBookmarkKey) {
          sendResponse({ id: null })
          return false
        }

        storageService
          .getValue<{ id: string; savedAt: number }>(activeBookmarkKey)
          .then(async (saved) => {
            if (
              !saved ||
              typeof saved.id !== "string" ||
              !saved.id ||
              typeof saved.savedAt !== "number" ||
              Date.now() - saved.savedAt > ACTIVE_BOOKMARK_RESTORE_MAX_AGE_MS
            ) {
              if (saved) await storageService.deleteValue(activeBookmarkKey)
              sendResponse({ id: null })
              return
            }
            await storageService.deleteValue(activeBookmarkKey)
            sendResponse({ id: saved.id })
          })
          .catch(() => sendResponse({ id: null }))
        return true
      }

      if (request?.type === bookmarkScrollMessage.save) {
        const value = request.value
        const targetTabId =
          typeof request.tabId === "number" ? request.tabId : sender.tab?.id
        const targetScrollKey =
          typeof targetTabId === "number"
            ? getBookmarkScrollRestoreKey(targetTabId)
            : null
        if (
          !targetScrollKey ||
          typeof value?.top !== "number" ||
          !Number.isFinite(value.top) ||
          value.top < 0 ||
          typeof value.savedAt !== "number"
        ) {
          sendResponse({ ok: false })
          return false
        }

        storageService
          .setValue(targetScrollKey, { top: value.top, savedAt: value.savedAt })
          .then((ok) => sendResponse({ ok }))
          .catch(() => sendResponse({ ok: false }))
        return true
      }

      if (request?.type === bookmarkScrollMessage.consume) {
        if (!bookmarkScrollKey) {
          sendResponse({ top: null })
          return false
        }

        storageService
          .getValue<{ top: number; savedAt: number }>(bookmarkScrollKey)
          .then(async (saved) => {
            if (
              !saved ||
              !Number.isFinite(saved.top) ||
              saved.top < 0 ||
              Date.now() - saved.savedAt > BOOKMARK_SCROLL_RESTORE_MAX_AGE_MS
            ) {
              if (saved) await storageService.deleteValue(bookmarkScrollKey)
              sendResponse({ top: null })
              return
            }
            sendResponse({ top: saved.top })
          })
          .catch(() => sendResponse({ top: null }))
        return true
      }

      if (request?.type === bookmarkScrollMessage.clear) {
        if (!bookmarkScrollKey) {
          sendResponse({ ok: false })
          return false
        }
        storageService
          .deleteValue(bookmarkScrollKey)
          .then((ok) => sendResponse({ ok }))
          .catch(() => sendResponse({ ok: false }))
        return true
      }

      if (request?.type === chineseTradeMessage.rebuildCache) {
        prepareChineseTradeCaches(true, request.language, request.version)
          .then(async () => {
            const storage = await getStorageUsage()
            console.info("[PoeTradePlus] Chrome storage usage", storage)
            sendResponse({ ok: true, storage })
          })
          .catch(async (error) =>
            sendResponse({
              ok: false,
              error: getErrorMessage(error),
              storage: await getStorageUsage().catch(() => undefined)
            })
          )
        return true
      }

      if (request?.type === chineseTradeMessage.getTemplates) {
        getTradeTranslationState()
          .then(async (state) => {
            if (!state.enabled || request.version === "poe2") return {}
            const templates = await loadChineseStatTemplates()
            return state.language === "zh-cn"
              ? (templates.cn ?? {})
              : (templates.tw ?? {})
          })
          .then((templates) => sendResponse({ templates }))
          .catch(() => sendResponse({ templates: {} }))
        return true
      }

      if (request?.type === chineseTradeMessage.reloadTradeTabs) {
        reloadTranslatedTradeTabs(
          request.version === "poe2" ? "poe2" : "poe1"
        )
          .then(() => sendResponse({ ok: true }))
          .catch(() => sendResponse({ ok: false }))
        return true
      }

      return false
    })
  }
})
