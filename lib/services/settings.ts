import { writable } from "svelte/store"

import type { TradeSiteVersion } from "../types/trade-location"
import { setLanguage, type AppLanguage } from "./i18n"
import { storageService, type StorageArea } from "./storage"
import { getPendingSyncValue, stageSyncValue } from "./sync-journal"

export type SidebarSide = "left" | "right"
export type BookmarkTradeActionId =
  | "edit"
  | "replace"
  | "copy"
  | "openNewTab"
  | "duplicate"
  | "openLive"
  | "archive"
  | "toggle"
  | "delete"
export type QuickFiltersPlacement = "page" | "sidebar"
export type TextSizePreference = "small" | "medium" | "large" | "extraLarge"
export const DEFAULT_TEXT_SIZE: TextSizePreference = "large"
export const DEFAULT_HIGHLIGHTED_MOD_COLOR = "#28a745"
export type BookmarkLayout = "classic" | "compact" | "ultra"

const DEFAULT_CLASSIC_BOOKMARK_TRADE_ACTIONS: BookmarkTradeActionId[] = [
  "edit",
  "openNewTab",
  "toggle",
  "delete"
]

export interface VersionSettings {
  sidebarSide: SidebarSide
  sidebarWidth: number
  language: AppLanguage
  textSize: TextSizePreference
  translateTradeSite: boolean
  showEquivalentPricing: boolean
  showValdoRewardPricing: boolean
  showMagebloodLegacyDescriptions: boolean
  highlightedModColor: string
  showBulkSellers: boolean
  showPinnedItems: boolean
  showHistory: boolean
  showFinerFilters: boolean
  showQuickFilters: boolean
  quickFiltersPlacement: QuickFiltersPlacement
  autoFuzzySearch: boolean
  compactActionsMenu: boolean
  ultraCompactBookmarks: boolean
  classicBookmarkTradeActions: BookmarkTradeActionId[]
  compactBookmarkTradeActions: BookmarkTradeActionId[]
  ultraCompactBookmarkTradeActions: BookmarkTradeActionId[]
  bookmarkCategoriesEnabled: boolean
}

export interface AppSettings extends VersionSettings {}

const GLOBAL_SETTINGS_KEY = "app-settings"
const SETTINGS_STORAGE_AREA: StorageArea = "sync"
const LANGUAGE_SESSION_KEY = "poe-trade-plus-language"
export const DEFAULT_SIDEBAR_WIDTH = 450
const versionSettingsKey = (version: TradeSiteVersion) =>
  `app-settings-poe${version}`

function getInitialLanguage(): AppLanguage {
  if (typeof window === "undefined") return "en"

  const version = inferTradeVersion()
  const sessionKey = `${LANGUAGE_SESSION_KEY}-poe${version}`
  const localKey = `bt-language-poe${version}`
  const stored =
    window.sessionStorage.getItem(sessionKey) ??
    window.localStorage.getItem(localKey) ??
    // One-time UI fallback for installations created before settings were
    // separated by game. Sync migration remains the authoritative source.
    window.sessionStorage.getItem(LANGUAGE_SESSION_KEY) ??
    window.localStorage.getItem("bt-language")
  return stored === "en" ||
    stored === "es" ||
    stored === "pt" ||
    stored === "ru" ||
    stored === "th" ||
    stored === "de" ||
    stored === "fr" ||
    stored === "ja" ||
    stored === "ko" ||
    stored === "zh-cn" ||
    stored === "zh-tw"
    ? stored
    : "en"
}

const DEFAULT_VERSION_SETTINGS: VersionSettings = {
  sidebarSide: "right",
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  language: getInitialLanguage(),
  textSize: DEFAULT_TEXT_SIZE,
  translateTradeSite: false,
  showEquivalentPricing: false,
  showValdoRewardPricing: false,
  showMagebloodLegacyDescriptions: true,
  highlightedModColor: DEFAULT_HIGHLIGHTED_MOD_COLOR,
  showBulkSellers: false,
  showPinnedItems: false,
  showHistory: true,
  showFinerFilters: true,
  showQuickFilters: true,
  quickFiltersPlacement: "page",
  autoFuzzySearch: true,
  compactActionsMenu: false,
  ultraCompactBookmarks: false,
  classicBookmarkTradeActions: DEFAULT_CLASSIC_BOOKMARK_TRADE_ACTIONS,
  compactBookmarkTradeActions: [],
  ultraCompactBookmarkTradeActions: [],
  bookmarkCategoriesEnabled: false
}

function normalizeTextSize(textSize: unknown): TextSizePreference {
  return textSize === "small" ||
    textSize === "medium" ||
    textSize === "large" ||
    textSize === "extraLarge"
    ? textSize
    : DEFAULT_TEXT_SIZE
}

function normalizeHighlightedModColor(color: unknown): string {
  return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)
    ? color
    : DEFAULT_HIGHLIGHTED_MOD_COLOR
}

function highlightedModBackgroundColor(color: string, opacity: number): string {
  const normalized = normalizeHighlightedModColor(color)
  const red = Number.parseInt(normalized.slice(1, 3), 16)
  const green = Number.parseInt(normalized.slice(3, 5), 16)
  const blue = Number.parseInt(normalized.slice(5, 7), 16)
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

function getStorageChangeValue<T>(
  change: chrome.storage.StorageChange | undefined
): T | undefined {
  const payload = change?.newValue
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("value" in payload)
  ) {
    return undefined
  }

  return payload.value as T
}

let activeVersion: TradeSiteVersion = inferTradeVersion()
let activeVersionSettings: VersionSettings = DEFAULT_VERSION_SETTINGS
const versionCache = new Map<TradeSiteVersion, VersionSettings>()
let currentSettings: AppSettings = activeVersionSettings
let versionRequestId = 0

const { subscribe, set } = writable<AppSettings>(currentSettings)

function inferTradeVersion(): TradeSiteVersion {
  if (typeof window === "undefined") return "1"
  return window.location.pathname.startsWith("/trade2/") ? "2" : "1"
}

function copyVersionSettings(version: VersionSettings): AppSettings {
  return {
    ...version,
    classicBookmarkTradeActions: [...version.classicBookmarkTradeActions],
    compactBookmarkTradeActions: [...version.compactBookmarkTradeActions],
    ultraCompactBookmarkTradeActions: [
      ...version.ultraCompactBookmarkTradeActions
    ]
  }
}

function normalizeVersionSettings(
  value?: Partial<VersionSettings> | null
): VersionSettings {
  const defined = Object.fromEntries(
    Object.entries(value ?? {}).filter(([, setting]) => setting !== undefined)
  ) as Partial<VersionSettings>

  return {
    ...DEFAULT_VERSION_SETTINGS,
    ...defined,
    highlightedModColor: normalizeHighlightedModColor(defined.highlightedModColor),
    classicBookmarkTradeActions: [
      ...(defined.classicBookmarkTradeActions ??
        DEFAULT_CLASSIC_BOOKMARK_TRADE_ACTIONS)
    ],
    compactBookmarkTradeActions: [
      ...(defined.compactBookmarkTradeActions ?? [])
    ],
    ultraCompactBookmarkTradeActions: [
      ...(defined.ultraCompactBookmarkTradeActions ?? [])
    ]
  }
}

function legacyVersionSettings(
  value?: Partial<AppSettings> | null
): VersionSettings {
  return normalizeVersionSettings({
    sidebarSide: value?.sidebarSide,
    sidebarWidth: value?.sidebarWidth,
    language: value?.language,
    textSize: value?.textSize,
    translateTradeSite: value?.translateTradeSite === true,
    showEquivalentPricing: value?.showEquivalentPricing,
    showValdoRewardPricing: value?.showValdoRewardPricing,
    showMagebloodLegacyDescriptions: value?.showMagebloodLegacyDescriptions,
    highlightedModColor: value?.highlightedModColor,
    showBulkSellers: value?.showBulkSellers,
    showPinnedItems: value?.showPinnedItems,
    showHistory: value?.showHistory,
    showFinerFilters: value?.showFinerFilters,
    showQuickFilters: value?.showQuickFilters,
    quickFiltersPlacement: value?.quickFiltersPlacement,
    autoFuzzySearch: value?.autoFuzzySearch,
    compactActionsMenu: value?.compactActionsMenu,
    ultraCompactBookmarks: value?.ultraCompactBookmarks,
    classicBookmarkTradeActions: value?.classicBookmarkTradeActions,
    compactBookmarkTradeActions: value?.compactBookmarkTradeActions,
    ultraCompactBookmarkTradeActions: value?.ultraCompactBookmarkTradeActions,
    bookmarkCategoriesEnabled: value?.bookmarkCategoriesEnabled
  })
}

function publish() {
  currentSettings = copyVersionSettings(activeVersionSettings)
  setLanguage(currentSettings.language)
  if (typeof window !== "undefined") {
    const quickFiltersStorageKey = `bt-quick-filters-visible-poe${activeVersion}`
    window.localStorage.setItem(
      quickFiltersStorageKey,
      String(currentSettings.showQuickFilters)
    )
    window.localStorage.setItem(
      `bt-quick-filters-placement-poe${activeVersion}`,
      currentSettings.quickFiltersPlacement
    )
    window.localStorage.setItem(
      `bt-language-poe${activeVersion}`,
      currentSettings.language
    )
    document.documentElement.style.setProperty(
      "--bt-finer-filtered-background",
      highlightedModBackgroundColor(currentSettings.highlightedModColor, 0.1)
    )
    window.sessionStorage.setItem(
      `${LANGUAGE_SESSION_KEY}-poe${activeVersion}`,
      currentSettings.language
    )
    window.dispatchEvent(
      new CustomEvent("poe-trade-plus:quick-filters-change", {
        detail: {
          key: quickFiltersStorageKey,
          value: currentSettings.showQuickFilters,
          placement: currentSettings.quickFiltersPlacement,
          language: currentSettings.language
        }
      })
    )
  }
  set(currentSettings)
}

function bindStorageSync() {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== SETTINGS_STORAGE_AREA) return

    for (const version of ["1", "2"] as const) {
      const key = versionSettingsKey(version)
      const change = changes[key]
      if (!change) continue
      void getPendingSyncValue(key).then((pending) => {
        if (pending !== null) return
        const next = normalizeVersionSettings(
          getStorageChangeValue<Partial<VersionSettings>>(change)
        )
        versionCache.set(version, next)
        if (version === activeVersion) {
          activeVersionSettings = next
          publish()
        }
      })
    }
  })
}

async function fetchSynced<T>(key: string): Promise<T | null> {
  const pending = await getPendingSyncValue<T>(key)
  if (pending !== null) return pending
  const local = await storageService.getValue<T>(key)
  const synced = await storageService.getValue<T>(
    key,
    null,
    SETTINGS_STORAGE_AREA
  )
  if (synced !== null) return synced

  if (local === null) return null

  const migrated = await storageService.setValue(
    key,
    local,
    null,
    SETTINGS_STORAGE_AREA
  )
  if (migrated) {
    await storageService.deleteValue(key)
  }

  return local
}

async function persistSynced(key: string, value: unknown): Promise<boolean> {
  const localSaved = await storageService.setValue(key, value)
  if (!localSaved) return false
  const journaled = await stageSyncValue(key, value)
  if (!journaled) return false
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    void chrome.runtime
      .sendMessage({ type: "sync-journal-flush", delayMs: 500 })
      .catch(() => undefined)
  }
  return true
}

async function loadVersionSettings(
  version: TradeSiteVersion,
  legacy?: Partial<AppSettings> | null
) {
  const cached = versionCache.get(version)
  if (cached) return cached

  const stored = await fetchSynced<VersionSettings>(versionSettingsKey(version))
  const hasIndependentInterfaceSettings =
    typeof stored?.sidebarSide === "string" &&
    typeof stored?.sidebarWidth === "number" &&
    typeof stored?.language === "string" &&
    typeof stored?.textSize === "string"
  const legacySettings = legacyVersionSettings(legacy)
  const next = stored
    ? normalizeVersionSettings({ ...legacySettings, ...stored })
    : legacySettings

  versionCache.set(version, next)

  if (!stored || !hasIndependentInterfaceSettings) {
    await persistSynced(versionSettingsKey(version), next)
  }

  return next
}

async function load(force = false) {
  if (force) versionCache.clear()

  const requestedVersion = inferTradeVersion()
  const requestId = ++versionRequestId
  const legacySettings =
    await fetchSynced<Partial<AppSettings>>(GLOBAL_SETTINGS_KEY)

  const [poe1Settings, poe2Settings] = await Promise.all([
    loadVersionSettings("1", legacySettings),
    loadVersionSettings("2", legacySettings)
  ])
  if (requestId !== versionRequestId) return

  activeVersion = requestedVersion
  activeVersionSettings = requestedVersion === "2" ? poe2Settings : poe1Settings
  publish()
}

async function saveVersionForReload(next: VersionSettings) {
  const saved = await persistSynced(versionSettingsKey(activeVersion), next)
  if (!saved) {
    console.warn(
      `[Poe Trade Plus] Failed to persist PoE ${activeVersion} settings`
    )
    return false
  }

  activeVersionSettings = next
  versionCache.set(activeVersion, next)
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      `bt-language-poe${activeVersion}`,
      next.language
    )
    window.sessionStorage.setItem(
      `${LANGUAGE_SESSION_KEY}-poe${activeVersion}`,
      next.language
    )
  }
  return true
}

async function saveVersion(next: VersionSettings) {
  const saved = await persistSynced(versionSettingsKey(activeVersion), next)
  if (!saved) {
    console.warn(
      `[Poe Trade Plus] Failed to persist PoE ${activeVersion} settings`
    )
    return false
  }

  activeVersionSettings = next
  versionCache.set(activeVersion, next)
  publish()
  return true
}

bindStorageSync()

export const settings = {
  subscribe,
  load,
  reload() {
    return load(true)
  },
  getCurrent() {
    return currentSettings
  },
  getActiveVersion() {
    return activeVersion
  },
  async useVersion(version: TradeSiteVersion) {
    if (activeVersion === version) return

    const requestId = ++versionRequestId
    const next = await loadVersionSettings(version)
    if (requestId !== versionRequestId) return

    activeVersion = version
    activeVersionSettings = next
    publish()
  },
  async updateSide(sidebarSide: SidebarSide) {
    return saveVersion({ ...activeVersionSettings, sidebarSide })
  },
  async updateEquivalentPricingVisibility(showEquivalentPricing: boolean) {
    return saveVersion({ ...activeVersionSettings, showEquivalentPricing })
  },
  async updateValdoRewardPricingVisibility(showValdoRewardPricing: boolean) {
    return saveVersion({ ...activeVersionSettings, showValdoRewardPricing })
  },
  async updateMagebloodLegacyDescriptionsVisibility(
    showMagebloodLegacyDescriptions: boolean
  ) {
    return saveVersion({
      ...activeVersionSettings,
      showMagebloodLegacyDescriptions
    })
  },
  async updateHighlightedModColor(highlightedModColor: string) {
    return saveVersion({
      ...activeVersionSettings,
      highlightedModColor: normalizeHighlightedModColor(highlightedModColor)
    })
  },
  async updateBulkSellersVisibility(showBulkSellers: boolean) {
    return saveVersion({ ...activeVersionSettings, showBulkSellers })
  },
  async updatePinnedItemsVisibility(showPinnedItems: boolean) {
    return saveVersion({ ...activeVersionSettings, showPinnedItems })
  },
  async updateHistoryVisibility(showHistory: boolean) {
    return saveVersion({ ...activeVersionSettings, showHistory })
  },
  async updateFinerFiltersVisibility(showFinerFilters: boolean) {
    return saveVersion({ ...activeVersionSettings, showFinerFilters })
  },
  async updateQuickFiltersVisibility(showQuickFilters: boolean) {
    return saveVersion({ ...activeVersionSettings, showQuickFilters })
  },
  async updateQuickFiltersPlacement(
    quickFiltersPlacement: QuickFiltersPlacement
  ) {
    return saveVersion({ ...activeVersionSettings, quickFiltersPlacement })
  },
  async updateAutoFuzzySearch(autoFuzzySearch: boolean) {
    return saveVersion({ ...activeVersionSettings, autoFuzzySearch })
  },
  async updateSidebarWidth(sidebarWidth: number) {
    return saveVersion({ ...activeVersionSettings, sidebarWidth })
  },
  async updateTextSize(textSize: TextSizePreference) {
    return saveVersion({
      ...activeVersionSettings,
      textSize: normalizeTextSize(textSize)
    })
  },
  async updateLanguage(language: AppLanguage) {
    return saveVersion({ ...activeVersionSettings, language })
  },
  async updateLanguageForReload(language: AppLanguage) {
    return saveVersionForReload({ ...activeVersionSettings, language })
  },
  async updateTradeSiteTranslation(translateTradeSite: boolean) {
    return saveVersion({ ...activeVersionSettings, translateTradeSite })
  },
  async updateCompactActionsMenu(compactActionsMenu: boolean) {
    return saveVersion({ ...activeVersionSettings, compactActionsMenu })
  },
  async updateBookmarkLayout(
    compactActionsMenu: boolean,
    ultraCompactBookmarks: boolean
  ) {
    return saveVersion({
      ...activeVersionSettings,
      compactActionsMenu,
      ultraCompactBookmarks: compactActionsMenu && ultraCompactBookmarks
    })
  },
  async updateCompactBookmarkTradeActions(
    compactBookmarkTradeActions: BookmarkTradeActionId[]
  ) {
    return saveVersion({
      ...activeVersionSettings,
      compactBookmarkTradeActions: [...compactBookmarkTradeActions]
    })
  },
  async updateBookmarkTradeActions(
    layout: BookmarkLayout,
    actionIds: BookmarkTradeActionId[]
  ) {
    const orderedActions = [...actionIds]
    const key =
      layout === "classic"
        ? "classicBookmarkTradeActions"
        : layout === "compact"
          ? "compactBookmarkTradeActions"
          : "ultraCompactBookmarkTradeActions"

    return saveVersion({ ...activeVersionSettings, [key]: orderedActions })
  },
  async updateBookmarkCategoriesVisibility(bookmarkCategoriesEnabled: boolean) {
    return saveVersion({ ...activeVersionSettings, bookmarkCategoriesEnabled })
  }
}
