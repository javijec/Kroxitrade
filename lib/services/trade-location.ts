import { get, writable } from "svelte/store"

import type {
  ExactTradeLocationStruct,
  TradeLocationHistoryStruct,
  TradeLocationStruct,
  TradeSiteVersion
} from "../types/trade-location"
import { subscribeNavigation } from "../core/trade-navigation"
import {
  hasValidExtensionContext,
  isExtensionContextInvalidatedError
} from "../utilities/extension-context"
import { uniqueId } from "../utilities/unique-id"
import { formatTradeUrl } from "../utilities/trade-url-format"
import { getActiveTradeTab } from "./active-trade-tab"
import { languageStore, translate } from "./i18n"
import { searchPanelService } from "./search-panel"
import { storageService } from "./storage"

const DEFAULT_BASE_URL = "https://www.pathofexile.com"
const HISTORY_KEY = "trade-history"
const MAX_HISTORY = 50
const PENDING_BOOKMARK_TITLES_KEY = "pending-bookmark-titles"
const PENDING_BOOKMARK_TITLE_TTL_MS = 2 * 60 * 1000
const TRADE_REALMS = ["xbox", "sony", "poe2"]
const TRADE_HOSTNAME_PATTERN =
  /(?:^|\.)pathofexile\.com$|^pathofexile\.tw$|^poe(?:2)?\.kakaogames\.com$/i

const safeDecodeURIComponent = (value: string | undefined) => {
  if (!value) return value

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const encodeTradePathPart = (value: string) =>
  encodeURIComponent(safeDecodeURIComponent(value) || value)

const encodeTradeLeague = (league: string) =>
  league
    .split("/")
    .map((part) => encodeTradePathPart(part))
    .join("/")

export class TradeLocationService {
  private lastLocation: ExactTradeLocationStruct | null = null
  private listeners = new Set<
    (event: {
      old: ExactTradeLocationStruct
      new: ExactTradeLocationStruct
    }) => void
  >()
  private unsubscribeNavigation: (() => void) | null = null
  private activeTabTrackingStarted = false
  private focusHandler: (() => void) | null = null
  private activeTabUpdatedHandler:
    | ((
        tabId: number,
        changeInfo: chrome.tabs.OnUpdatedInfo,
        tab: chrome.tabs.Tab
      ) => void)
    | null = null
  private activeTabActivatedHandler:
    ((activeInfo: chrome.tabs.OnActivatedInfo) => void) | null = null

  // Svelte store for reactivity
  public locationStore = writable<ExactTradeLocationStruct>(
    this.parseCurrentLocation()
  )

  constructor() {
    this.lastLocation = this.parseCurrentLocation()
  }

  get current() {
    if (this.isExtensionUi()) {
      return this.lastLocation ?? this.emptyLocation()
    }

    return this.parseCurrentPath()
  }

  start() {
    if (this.isExtensionUi()) {
      if (this.activeTabTrackingStarted) {
        return
      }
      this.activeTabTrackingStarted = true
      void this.startActiveTabTracking()
      return
    }

    if (this.unsubscribeNavigation) return // Don't start twice

    // The Trade SPA only changes the URL through the history API. React to
    // pushState/replaceState (dispatched as a DOM CustomEvent from the MAIN
    // world) and to popstate instead of polling the location every second.
    this.unsubscribeNavigation = subscribeNavigation(() => {
      this.syncCurrentLocation()
    })
  }

  stop() {
    this.unsubscribeNavigation?.()
    this.unsubscribeNavigation = null
    if (this.focusHandler) {
      window.removeEventListener("focus", this.focusHandler)
      this.focusHandler = null
    }
    this.removeActiveTabListeners()
    this.activeTabTrackingStarted = false
  }

  private async startActiveTabTracking() {
    await this.refreshFromActiveTab()

    if (!hasValidExtensionContext() || !chrome.tabs) {
      return
    }

    if (!this.activeTabUpdatedHandler && chrome.tabs.onUpdated) {
      this.activeTabUpdatedHandler = (tabId, changeInfo, tab) => {
        if (changeInfo.url || tab.active) {
          void this.refreshFromActiveTab()
        }
      }
      try {
        chrome.tabs.onUpdated.addListener(this.activeTabUpdatedHandler)
      } catch (error) {
        if (!isExtensionContextInvalidatedError(error)) {
          console.warn(
            "[Poe Trade Plus] Failed to subscribe to tab updates",
            error
          )
        }
      }
    }

    if (!this.activeTabActivatedHandler && chrome.tabs.onActivated) {
      this.activeTabActivatedHandler = () => {
        void this.refreshFromActiveTab()
      }
      try {
        chrome.tabs.onActivated.addListener(this.activeTabActivatedHandler)
      } catch (error) {
        if (!isExtensionContextInvalidatedError(error)) {
          console.warn(
            "[Poe Trade Plus] Failed to subscribe to tab activation",
            error
          )
        }
      }
    }

    if (!this.focusHandler) {
      this.focusHandler = () => {
        void this.refreshFromActiveTab()
      }
      window.addEventListener("focus", this.focusHandler)
    }
  }

  private async refreshFromActiveTab() {
    const tab = await getActiveTradeTab()
    const current = this.parseUrl(tab?.url ?? null)
    this.locationStore.set(current)

    if (!this.lastLocation || !this.isExactEqual(this.lastLocation, current)) {
      const old = this.lastLocation ?? current
      this.lastLocation = current
      this.notify(old, current)
    }
  }

  private removeActiveTabListeners() {
    if (!hasValidExtensionContext() || !chrome.tabs) {
      this.activeTabUpdatedHandler = null
      this.activeTabActivatedHandler = null
      return
    }

    if (this.activeTabUpdatedHandler && chrome.tabs.onUpdated) {
      try {
        chrome.tabs.onUpdated.removeListener(this.activeTabUpdatedHandler)
      } catch (error) {
        if (!isExtensionContextInvalidatedError(error)) {
          console.warn(
            "[Poe Trade Plus] Failed to unsubscribe from tab updates",
            error
          )
        }
      }
      this.activeTabUpdatedHandler = null
    }

    if (this.activeTabActivatedHandler && chrome.tabs.onActivated) {
      try {
        chrome.tabs.onActivated.removeListener(this.activeTabActivatedHandler)
      } catch (error) {
        if (!isExtensionContextInvalidatedError(error)) {
          console.warn(
            "[Poe Trade Plus] Failed to unsubscribe from tab activation",
            error
          )
        }
      }
      this.activeTabActivatedHandler = null
    }
  }

  onChange(
    callback: (event: {
      old: ExactTradeLocationStruct
      new: ExactTradeLocationStruct
    }) => void
  ) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notify(
    old: ExactTradeLocationStruct,
    current: ExactTradeLocationStruct
  ) {
    this.listeners.forEach((l) => l({ old, new: current }))
  }

  private syncCurrentLocation() {
    const current = this.parseCurrentPath()
    this.locationStore.set(current)
    if (!this.lastLocation || !this.isExactEqual(this.lastLocation, current)) {
      const old = this.lastLocation ?? current
      this.lastLocation = current
      this.notify(old, current)
      void this.maybeLogHistory(current)
    }
  }

  private async maybeLogHistory(location: ExactTradeLocationStruct) {
    if (!location.slug || !location.type || !location.league) return

    const history = await this.fetchHistory(location.version)
    if (history[0] && this.isEqual(history[0], location)) return

    const pendingTitle = await this.readPendingBookmarkTitle(location.slug)
    const entry = {
      ...location,
      id: uniqueId(),
      title:
        pendingTitle ||
        searchPanelService.recommendTitle() ||
        translate(get(languageStore), "history.untitledSearch"),
      createdAt: new Date().toISOString()
    } as TradeLocationHistoryStruct

    if (await this.logHistoryViaBackground(location.version, entry)) return

    history.unshift(entry)

    await storageService.setValue(
      this.getHistoryStorageKey(location.version),
      history.slice(0, MAX_HISTORY)
    )
  }

  async stashPendingBookmarkTitles(titlesBySlug: Record<string, string>) {
    const existing =
      (await storageService.getValue<Record<string, string>>(
        PENDING_BOOKMARK_TITLES_KEY
      )) || {}

    for (const [slug, title] of Object.entries(titlesBySlug)) {
      if (slug && title) {
        existing[slug] = title
      }
    }

    await storageService.setEphemeralValue(
      PENDING_BOOKMARK_TITLES_KEY,
      existing,
      new Date(Date.now() + PENDING_BOOKMARK_TITLE_TTL_MS)
    )
  }

  private async readPendingBookmarkTitle(slug: string) {
    const titles = await storageService.getValue<Record<string, string>>(
      PENDING_BOOKMARK_TITLES_KEY
    )
    return titles?.[slug]
  }

  private async logHistoryViaBackground(
    version: TradeSiteVersion,
    entry: TradeLocationHistoryStruct
  ): Promise<boolean> {
    if (!hasValidExtensionContext()) return false

    try {
      const response = await chrome.runtime.sendMessage({
        query: "log-trade-history",
        key: this.getHistoryStorageKey(version),
        entry,
        max: MAX_HISTORY
      })
      return (
        !!response &&
        typeof response === "object" &&
        (response as { logged?: unknown }).logged === true
      )
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.warn("Could not write trade history through background", error)
      }
      return false
    }
  }

  async fetchHistory(
    version: TradeSiteVersion = this.current.version
  ): Promise<TradeLocationHistoryStruct[]> {
    const historyKey = this.getHistoryStorageKey(version)
    const scopedHistory =
      await storageService.getValue<TradeLocationHistoryStruct[]>(historyKey)

    if (scopedHistory) {
      return scopedHistory
    }

    const legacyHistory =
      (await storageService.getValue<TradeLocationHistoryStruct[]>(
        HISTORY_KEY
      )) || []
    const migratedHistory = legacyHistory
      .filter((entry) => entry.version === version)
      .slice(0, MAX_HISTORY)

    if (migratedHistory.length > 0) {
      await storageService.setValue(historyKey, migratedHistory)
    }

    return migratedHistory
  }

  async clearHistoryEntries(version: TradeSiteVersion = this.current.version) {
    await storageService.deleteValue(this.getHistoryStorageKey(version))

    const legacyHistory =
      await storageService.getValue<TradeLocationHistoryStruct[]>(HISTORY_KEY)
    if (!legacyHistory) {
      return
    }

    const remainingLegacyHistory = legacyHistory.filter(
      (entry) => entry.version !== version
    )
    if (remainingLegacyHistory.length === 0) {
      await storageService.deleteValue(HISTORY_KEY)
      return
    }

    await storageService.setValue(HISTORY_KEY, remainingLegacyHistory)
  }

  getTradeUrl(
    version: TradeSiteVersion,
    type: string,
    slug: string,
    league: string
  ) {
    const basePath = version === "2" ? "trade2" : "trade"
    return formatTradeUrl(
      this.getTradeBaseUrl(),
      basePath,
      type,
      encodeTradePathPart(type),
      encodeTradeLeague(league),
      slug,
      encodeTradePathPart(slug)
    )
  }

  compareTradeLocations(a: TradeLocationStruct, b: TradeLocationStruct) {
    return (
      a.version === b.version &&
      a.league === b.league &&
      a.slug === b.slug &&
      a.type === b.type
    )
  }

  private isEqual(a: TradeLocationStruct, b: TradeLocationStruct) {
    return this.compareTradeLocations(a, b)
  }

  private isExactEqual(
    a: ExactTradeLocationStruct,
    b: ExactTradeLocationStruct
  ) {
    return this.isEqual(a, b) && a.isLive === b.isLive
  }

  private isExtensionUi() {
    return window.location.protocol === "chrome-extension:"
  }

  private getTradeBaseUrl() {
    if (
      typeof window !== "undefined" &&
      TRADE_HOSTNAME_PATTERN.test(window.location.hostname) &&
      window.location.pathname.startsWith("/trade")
    ) {
      return window.location.origin
    }

    return DEFAULT_BASE_URL
  }

  private parseCurrentLocation() {
    if (this.isExtensionUi()) {
      return this.emptyLocation()
    }

    return this.parseCurrentPath()
  }

  private emptyLocation(): ExactTradeLocationStruct {
    return {
      version: "1",
      type: null,
      league: null,
      slug: null,
      isLive: false
    }
  }

  private parseCurrentPath(): ExactTradeLocationStruct {
    return this.parseUrl(window.location.href)
  }

  private getHistoryStorageKey(version: TradeSiteVersion) {
    return `${HISTORY_KEY}-poe${version}`
  }

  private parseUrl(urlString: string | null): ExactTradeLocationStruct {
    if (!urlString) {
      return this.emptyLocation()
    }

    let url: URL

    try {
      url = new URL(urlString)
    } catch {
      return this.emptyLocation()
    }

    if (
      !TRADE_HOSTNAME_PATTERN.test(url.hostname) ||
      !url.pathname.startsWith("/trade")
    ) {
      return this.emptyLocation()
    }

    const pathParts = url.pathname.split("/").slice(1)
    let versionPart: string,
      type: string | undefined,
      league: string | undefined,
      slug: string | undefined,
      live: string | undefined

    // Handle realm-based URLs: /trade/search/xbox/LeagueName/slug
    if (pathParts.length > 2 && TRADE_REALMS.includes(pathParts[2])) {
      let realm: string, leagueInRealm: string
      ;[versionPart, type, realm, leagueInRealm, slug, live] = pathParts
      league = `${safeDecodeURIComponent(realm)}/${safeDecodeURIComponent(leagueInRealm)}`
    } else {
      ;[versionPart, type, league, slug, live] = pathParts
      league = safeDecodeURIComponent(league)
    }

    return {
      version: versionPart === "trade2" ? "2" : "1",
      type: type || null,
      league: league || null,
      slug: slug || null,
      isLive: live === "live"
    }
  }
}

export const tradeLocationService = new TradeLocationService()
