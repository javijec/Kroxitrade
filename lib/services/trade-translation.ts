import { storageService } from "./storage"

export const TRADE_TRANSLATION_LANGS = new Set(["zh-tw", "zh-cn"])

export interface TradeTranslationState {
  language: string
  enabled: boolean
  version: "poe1" | "poe2"
}

const getStoredTradeLanguage = async () => {
  const syncedSettings = await storageService.getValue<Record<string, unknown>>(
    "app-settings",
    null,
    "sync"
  )
  const settings = syncedSettings ?? await storageService.getValue<Record<string, unknown>>(
    "app-settings"
  )
  const version = isPoe2TradeSite() ? "poe2" : "poe1"
  const versionSettingsKey = `app-settings-${version}`
  const syncedVersionSettings = await storageService.getValue<Record<string, unknown>>(
    versionSettingsKey,
    null,
    "sync"
  )
  const versionSettings =
    syncedVersionSettings ??
    await storageService.getValue<Record<string, unknown>>(versionSettingsKey)
  // The current game's record is authoritative. The legacy global record is
  // only consulted until Settings has migrated an older installation.
  const language = String(
    versionSettings?.language ??
      (versionSettings == null ? settings?.language : "en")
  )
  return {
    language,
    version,
    // The fallback preserves an existing enabled installation until Settings
    // migrates the old global value into each game-specific settings record.
    translateTradeSite:
      versionSettings?.translateTradeSite === true ||
      (versionSettings == null && settings?.translateTradeSite === true)
  }
}

export const getChineseTradeLanguage = async (): Promise<string | null> => {
  const { language } = await getStoredTradeLanguage()
  return TRADE_TRANSLATION_LANGS.has(language) ? language : null
}

export const getTradeTranslationState = async (): Promise<TradeTranslationState> => {
  const { language, translateTradeSite } = await getStoredTradeLanguage()
  const enabled =
    !isNativeChineseTradeSite() &&
    TRADE_TRANSLATION_LANGS.has(language) &&
    translateTradeSite

  return { language, enabled, version: isPoe2TradeSite() ? "poe2" : "poe1" }
}

// The Taiwan trade site is already Chinese, but its Quick Filters are injected
// by our extension in English. Let the supplemental UI translator run there
// whenever the extension itself is using Chinese, without enabling the cache
// replacement intended for the international site.
export const getChineseSupplementState = async (): Promise<TradeTranslationState> => {
  const { language, translateTradeSite } = await getStoredTradeLanguage()
  const chinese = TRADE_TRANSLATION_LANGS.has(language)
  return {
    language,
    enabled:
      chinese &&
      (isNativeChineseTradeSite() || translateTradeSite),
    version: isPoe2TradeSite() ? "poe2" : "poe1"
  }
}

export const isTradeTranslationEnabled = async (): Promise<boolean> =>
  (await getTradeTranslationState()).enabled

function isNativeChineseTradeSite() {
  return typeof location !== "undefined" && location.hostname === "pathofexile.tw"
}

function isPoe2TradeSite() {
  return typeof location !== "undefined" && location.pathname.startsWith("/trade2/")
}
