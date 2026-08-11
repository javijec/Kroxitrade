<script lang="ts">
  import { languageStore, translate, type AppLanguage } from "../../lib/services/i18n";
  import { bookmarksService } from "../../lib/services/bookmarks";
  import { extensionBackupService } from "../../lib/services/extension-backup";
  import {
    coeButtonSetting,
    coeDesecratedModsSetting,
    experimentalSettings,
    poe2CopyButtonSetting,
    wikiButtonSetting
  } from "../../lib/services/experimental";
  import { flashMessages } from "../../lib/services/flash";
  import { itemResultsService } from "../../lib/services/item-results";
  import {
    chineseTradeMessage,
    chineseTradePageStorageFor,
    chineseTradeStorageFor,
    type ChineseTradeVersion
  } from "../../lib/services/chinese-trade/contract";
  import { DEFAULT_SIDEBAR_WIDTH, settings, type BookmarkLayout, type BookmarkTradeActionId, type QuickFiltersPlacement, type SidebarSide, type TextSizePreference } from "../../lib/services/settings";
  import { tradeLocationService } from "../../lib/services/trade-location";
  import { isNativeChineseTradeSite } from "../../lib/config/trade-hosts";
  import type { BookmarksFolderStruct, BookmarksTradeStruct } from "../../lib/types/bookmarks";
  import BookmarkFolder from "../BookmarkFolder.svelte";
  import Button from "../Button.svelte";
  import SvgIcon from "../SvgIcon.svelte";
  import TradeActionsMenu from "../TradeActionsMenu.svelte";
  import ToggleRow from "../ToggleRow.svelte";
  import { onDestroy, onMount } from "svelte";
  import flagBR from "../../assets/BR.png?inline";
  import flagDE from "../../assets/DE.png?inline";
  import flagES from "../../assets/ES.png?inline";
  import flagFR from "../../assets/FR.png?inline";
  import flagGB from "../../assets/GB.png?inline";
  import flagJP from "../../assets/JP.png?inline";
  import flagKR from "../../assets/KR.png?inline";
  import flagRU from "../../assets/RU.png?inline";
  import flagTH from "../../assets/TH.png?inline";
  const flagTW = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'%3E%3Cpath fill='%23fe0000' d='M0 0h30v20H0z'/%3E%3Cpath fill='%23000095' d='M0 0h15v10H0z'/%3E%3Ccircle cx='7.5' cy='5' r='2.5' fill='white'/%3E%3C/svg%3E";
  const flagCN = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'%3E%3Cpath fill='%23de2910' d='M0 0h30v20H0z'/%3E%3Cpath fill='%23ffde00' d='m5 2 .6 1.8 1.9.1-1.5 1.1.5 1.8L5 5.7 3.5 6.8 4 5 2.5 3.9l1.9-.1z'/%3E%3C/svg%3E";
  import editIcon from "lucide-static/icons/pencil.svg?raw";
  import replaceIcon from "lucide-static/icons/refresh-cw.svg?raw";
  import linkIcon from "lucide-static/icons/link.svg?raw";
  import externalLinkIcon from "lucide-static/icons/external-link.svg?raw";
  import duplicateIcon from "lucide-static/icons/copy.svg?raw";
  import liveIcon from "lucide-static/icons/activity.svg?raw";
  import archiveIcon from "lucide-static/icons/archive.svg?raw";
  import toggleIcon from "lucide-static/icons/check.svg?raw";
  import deleteIcon from "lucide-static/icons/trash-2.svg?raw";

  interface Props {
    tutorialStep?: string | null;
  }

  let { tutorialStep = null }: Props = $props();

  type SettingsTab = "interface" | "sidebar" | "results" | "bookmarks";
  let activeTab = $state<SettingsTab>("interface");

  const tabs: Array<{ id: SettingsTab; labelKey: string }> = [
    { id: "interface", labelKey: "settings.tabs.interface" },
    { id: "sidebar", labelKey: "settings.tabs.sidebar" },
    { id: "results", labelKey: "settings.tabs.results" },
    { id: "bookmarks", labelKey: "settings.tabs.bookmarks" },
  ];

  const tutorialStepTabs: Record<string, SettingsTab> = {
    "settings-sidebar": "interface",
    "settings-language": "interface",
    "settings-equivalent": "results",
    "settings-bulk": "sidebar",
    "settings-history": "sidebar",
    "settings-bookmarks": "bookmarks"
  };
  const compactTradeActionOptions: Array<{ id: BookmarkTradeActionId; labelKey: string; icon: string }> = [
    { id: "edit", labelKey: "folder.editSearchName", icon: editIcon },
    { id: "replace", labelKey: "folder.replaceCurrentSearch", icon: replaceIcon },
    { id: "copy", labelKey: "folder.copyUrl", icon: linkIcon },
    { id: "openNewTab", labelKey: "folder.openInNewTab", icon: externalLinkIcon },
    { id: "duplicate", labelKey: "folder.duplicateTrade", icon: duplicateIcon },
    { id: "openLive", labelKey: "folder.openLiveSearch", icon: liveIcon },
    { id: "archive", labelKey: "folder.archiveTrade", icon: archiveIcon },
    { id: "toggle", labelKey: "settings.compactTradeActionToggle", icon: toggleIcon },
    { id: "delete", labelKey: "folder.deleteTrade", icon: deleteIcon }
  ];
  const previewTrade: BookmarksTradeStruct = {
    id: "settings-preview-trade",
    title: "High resistance boots",
    completedAt: null,
    archivedAt: null,
    location: {
      version: "2",
      type: "search",
      slug: "settings-preview",
      league: "Mercenaries"
    }
  };
  const previewTradeSecondary: BookmarksTradeStruct = {
    ...previewTrade,
    id: "settings-preview-trade-secondary",
    location: {
      ...previewTrade.location,
      slug: "settings-preview-secondary"
    }
  };
  const previewMappingCategoryId = "settings-preview-category-mapping";
  const previewBossingCategoryId = "settings-preview-category-bossing";
  let previewFolder = $derived<BookmarksFolderStruct>({
    title: translate($languageStore, "settings.bookmarkPreviewFolder"),
    version: "2",
    icon: null,
    archivedAt: null,
    categories: [
      {
        id: previewMappingCategoryId,
        title: translate($languageStore, "settings.bookmarkPreviewCategoryMapping")
      },
      {
        id: previewBossingCategoryId,
        title: translate($languageStore, "settings.bookmarkPreviewCategoryBossing")
      }
    ]
  });
  let previewBookmarks = $derived<BookmarksTradeStruct[]>([
    {
      ...previewTrade,
      title: translate($languageStore, "settings.bookmarkPreviewTrade"),
      categoryId: previewMappingCategoryId
    },
    {
      ...previewTradeSecondary,
      title: translate($languageStore, "settings.bookmarkPreviewTradeSecondary"),
      categoryId: previewBossingCategoryId
    }
  ]);
  const languages: Array<{ code: AppLanguage; label: string; flag: string; emoji: string }> = [
    { code: "en", label: "English", flag: flagGB, emoji: "🇬🇧" },
    { code: "es", label: "Español", flag: flagES, emoji: "🇪🇸" },
    { code: "pt", label: "Português", flag: flagBR, emoji: "🇧🇷" },
    { code: "ru", label: "Русский", flag: flagRU, emoji: "🇷🇺" },
    { code: "th", label: "ไทย", flag: flagTH, emoji: "🇹🇭" },
    { code: "de", label: "Deutsch", flag: flagDE, emoji: "🇩🇪" },
    { code: "fr", label: "Français", flag: flagFR, emoji: "🇫🇷" },
    { code: "ja", label: "日本語", flag: flagJP, emoji: "🇯🇵" },
    { code: "ko", label: "한국어", flag: flagKR, emoji: "🇰🇷" },
    { code: "zh-tw", label: "繁體中文", flag: flagTW, emoji: "🇹🇼" },
    { code: "zh-cn", label: "简体中文", flag: flagCN, emoji: "🇨🇳" }
  ];
  const textSizeOptions: Array<{ id: TextSizePreference; labelKey: string }> = [
    { id: "small", labelKey: "settings.textSizeSmall" },
    { id: "medium", labelKey: "settings.textSizeMedium" },
    { id: "large", labelKey: "settings.textSizeLarge" },
    { id: "extraLarge", labelKey: "settings.textSizeExtraLarge" }
  ];
  const canTranslateTradeSite = $derived(
    ($settings.language === "zh-tw" || $settings.language === "zh-cn") &&
      window.location.hostname !== "pathofexile.tw"
  );
  const currentChineseTradeVersion = (): ChineseTradeVersion =>
    window.location.pathname.startsWith("/trade2/") ? "poe2" : "poe1";

  const localizedLanguageNames: Record<AppLanguage, Record<AppLanguage, string>> = {
    en: { en: "English", es: "Spanish", pt: "Portuguese", ru: "Russian", th: "Thai", de: "German", fr: "French", ja: "Japanese", ko: "Korean", "zh-tw": "Traditional Chinese", "zh-cn": "Simplified Chinese" },
    es: { en: "Inglés", es: "Español", pt: "Portugués", ru: "Ruso", th: "Tailandés", de: "Alemán", fr: "Francés", ja: "Japonés", ko: "Coreano", "zh-tw": "Chino tradicional", "zh-cn": "Chino simplificado" },
    pt: { en: "Inglês", es: "Espanhol", pt: "Português", ru: "Russo", th: "Tailandês", de: "Alemão", fr: "Francês", ja: "Japonês", ko: "Coreano", "zh-tw": "Chinês tradicional", "zh-cn": "Chinês simplificado" },
    ru: { en: "Английский", es: "Испанский", pt: "Португальский", ru: "Русский", th: "Тайский", de: "Немецкий", fr: "Французский", ja: "Японский", ko: "Корейский", "zh-tw": "Традиционный китайский", "zh-cn": "Упрощённый китайский" },
    th: { en: "อังกฤษ", es: "สเปน", pt: "โปรตุเกส", ru: "รัสเซีย", th: "ไทย", de: "เยอรมัน", fr: "ฝรั่งเศส", ja: "ญี่ปุ่น", ko: "เกาหลี", "zh-tw": "จีนตัวเต็ม", "zh-cn": "จีนตัวย่อ" },
    de: { en: "Englisch", es: "Spanisch", pt: "Portugiesisch", ru: "Russisch", th: "Thailändisch", de: "Deutsch", fr: "Französisch", ja: "Japanisch", ko: "Koreanisch", "zh-tw": "Traditionelles Chinesisch", "zh-cn": "Vereinfachtes Chinesisch" },
    fr: { en: "Anglais", es: "Espagnol", pt: "Portugais", ru: "Russe", th: "Thaï", de: "Allemand", fr: "Français", ja: "Japonais", ko: "Coréen", "zh-tw": "Chinois traditionnel", "zh-cn": "Chinois simplifié" },
    ja: { en: "英語", es: "スペイン語", pt: "ポルトガル語", ru: "ロシア語", th: "タイ語", de: "ドイツ語", fr: "フランス語", ja: "日本語", ko: "韓国語", "zh-tw": "繁体字中国語", "zh-cn": "簡体字中国語" },
    ko: { en: "영어", es: "스페인어", pt: "포르투갈어", ru: "러시아어", th: "태국어", de: "독일어", fr: "프랑스어", ja: "일본어", ko: "한국어", "zh-tw": "번체 중국어", "zh-cn": "간체 중국어" },
    "zh-tw": { en: "英文", es: "西班牙文", pt: "葡萄牙文", ru: "俄文", th: "泰文", de: "德文", fr: "法文", ja: "日文", ko: "韓文", "zh-tw": "繁體中文", "zh-cn": "简体中文" },
    "zh-cn": { en: "英语", es: "西班牙语", pt: "葡萄牙语", ru: "俄语", th: "泰语", de: "德语", fr: "法语", ja: "日语", ko: "韩语", "zh-tw": "繁體中文", "zh-cn": "简体中文" }
  };

  let isLanguageMenuOpen = $state(false);
  let isRefreshingEquivalentRatios = $state(false);
  let isHighlightedModColorPickerOpen = $state(false);
  let draftHighlightedModColor = $state("");
  let languageSelectorEl: HTMLDivElement | null = $state(null);
  const highlightedModColorPresets = [
    "#28a745", "#f0f0f0", "#a38d6d", "#6c757d",
    "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444",
    "#f97316", "#eab308", "#14b8a6", "#22c55e"
  ];

  async function handleSideChange(side: SidebarSide) {
    if (!(await settings.updateSide(side))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function handleEquivalentPricingChange(showEquivalentPricing: boolean) {
    if (!(await settings.updateEquivalentPricingVisibility(showEquivalentPricing))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function handleValdoRewardPricingChange(showValdoRewardPricing: boolean) {
    if (!(await settings.updateValdoRewardPricingVisibility(showValdoRewardPricing))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function handleMagebloodLegacyDescriptionsChange(showMagebloodLegacyDescriptions: boolean) {
    if (!(await settings.updateMagebloodLegacyDescriptionsVisibility(showMagebloodLegacyDescriptions))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function saveHighlightedModColor(color: string) {
    if (!(await settings.updateHighlightedModColor(color))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  function toggleHighlightedModColorPicker() {
    draftHighlightedModColor = $settings.highlightedModColor;
    isHighlightedModColorPickerOpen = !isHighlightedModColorPickerOpen;
  }

  async function selectHighlightedModColor(color: string) {
    draftHighlightedModColor = color;
    await saveHighlightedModColor(color);
    isHighlightedModColorPickerOpen = false;
  }

  async function commitHighlightedModColor() {
    if (!/^#[0-9a-f]{6}$/i.test(draftHighlightedModColor)) return;
    await selectHighlightedModColor(draftHighlightedModColor);
  }

  async function handleEquivalentPricingRefresh() {
    if (isRefreshingEquivalentRatios) return;

    const league = tradeLocationService.current.league;
    if (!league) {
      flashMessages.alert(translate($languageStore, "settings.equivalentRefreshUnavailable"));
      return;
    }

    isRefreshingEquivalentRatios = true;
    try {
      await itemResultsService.forceRefreshEquivalentPricing();
      flashMessages.success(
        translate($languageStore, "settings.equivalentRefreshSuccess", { league })
      );
    } catch {
      flashMessages.alert(translate($languageStore, "settings.equivalentRefreshError"));
    } finally {
      isRefreshingEquivalentRatios = false;
    }
  }

  async function handleBulkSellersChange(showBulkSellers: boolean) {
    if (!(await settings.updateBulkSellersVisibility(showBulkSellers))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }
  async function handlePinnedItemsChange(showPinnedItems: boolean) {
    if (!(await settings.updatePinnedItemsVisibility(showPinnedItems))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function handleHistoryChange(showHistory: boolean) {
    if (!(await settings.updateHistoryVisibility(showHistory))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function handleQuickFiltersChange(showQuickFilters: boolean) {
    if (!(await settings.updateQuickFiltersVisibility(showQuickFilters))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function handleQuickFiltersPlacementChange(quickFiltersPlacement: QuickFiltersPlacement) {
    if (!(await settings.updateQuickFiltersPlacement(quickFiltersPlacement))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function handleAutoFuzzySearchChange(autoFuzzySearch: boolean) {
    if (!(await settings.updateAutoFuzzySearch(autoFuzzySearch))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function handleTradeSiteTranslationChange(translateTradeSite: boolean) {
    if (!(await settings.updateTradeSiteTranslation(translateTradeSite))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
      return;
    }

    if (translateTradeSite && ($settings.language === "zh-tw" || $settings.language === "zh-cn")) {
      if (!(await prepareChineseTradeCache($settings.language, currentChineseTradeVersion()))) {
        flashMessages.alert(translate($languageStore, "settings.saveFailed"));
        return;
      }
    }

    if (!(await reloadChineseTradeTabs(currentChineseTradeVersion()))) {
      window.location.reload();
    }
  }

  function rebuildChineseTradeData(
    language: "zh-tw" | "zh-cn" | undefined,
    version: ChineseTradeVersion
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: chineseTradeMessage.rebuildCache, language, version }, (reply) => {
          if (reply?.ok !== true) {
            console.error("[PoeTradePlus] Chinese Trade cache rebuild failed", {
              error: reply?.error ?? chrome.runtime.lastError?.message ?? "No response from background",
              storage: reply?.storage
            });
          }
          resolve(reply?.ok === true);
        });
      } catch {
        resolve(false);
      }
    });
  }

  function reloadChineseTradeTabs(version: ChineseTradeVersion): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: chineseTradeMessage.reloadTradeTabs, version }, (reply) => {
          resolve(reply?.ok === true);
        });
      } catch {
        resolve(false);
      }
    });
  }

  function readChineseTradeCache(keys: string[]): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(keys, (value) => resolve(value as Record<string, unknown>));
      } catch {
        resolve({});
      }
    });
  }

  async function prepareChineseTradeCache(
    language: "zh-tw" | "zh-cn",
    version = currentChineseTradeVersion()
  ) {
    if (!(await rebuildChineseTradeData(language, version))) return false;

    const storage = chineseTradeStorageFor(version);
    const pageStorage = chineseTradePageStorageFor(version);
    const source = language === "zh-cn"
      ? storage.simplified
      : storage.traditional;
    const targets = version === "poe2"
      ? { stats: "lscache-trade2stats", static: "lscache-trade2data", filters: "lscache-trade2filters", items: "lscache-trade2items" }
      : { stats: "lscache-tradestats", static: "lscache-tradedata", filters: "lscache-tradefilters" };
    const sourceKeys = Object.keys(targets).map((key) => source[key as keyof typeof source]);
    const cache = await readChineseTradeCache(sourceKeys);

    let injected = false;
    for (const [sourceKey, target] of Object.entries(targets).map(
      ([sourceName, target]) => [source[sourceName as keyof typeof source], target] as const
    )) {
      const value = cache[sourceKey];
      if (!Array.isArray(value)) continue;
      window.localStorage.setItem(target, JSON.stringify(value));
      window.localStorage.removeItem(`${target}-cacheexpiration`);
      injected = true;
    }

    if (injected) window.localStorage.setItem(pageStorage.injected, "1");
    return Array.isArray(cache[source.stats]);
  }

  async function handleBookmarkLayoutChange(
    compactActionsMenu: boolean,
    ultraCompactBookmarks = false
  ) {
    if (!(await settings.updateBookmarkLayout(compactActionsMenu, ultraCompactBookmarks))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function handleBookmarkCategoriesChange(bookmarkCategoriesEnabled: boolean) {
    if (!(await settings.updateBookmarkCategoriesVisibility(bookmarkCategoriesEnabled))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  function getActiveBookmarkLayout(): BookmarkLayout {
    if ($settings.ultraCompactBookmarks) return "ultra";
    return $settings.compactActionsMenu ? "compact" : "classic";
  }

  function getVisibleBookmarkTradeActions(): BookmarkTradeActionId[] {
    const layout = getActiveBookmarkLayout();
    return layout === "classic"
      ? $settings.classicBookmarkTradeActions
      : layout === "compact"
        ? $settings.compactBookmarkTradeActions
        : $settings.ultraCompactBookmarkTradeActions;
  }

  async function handleCompactTradeActionChange(actionId: BookmarkTradeActionId, checked: boolean) {
    const layout = getActiveBookmarkLayout();
    const visibleActions = getVisibleBookmarkTradeActions();
    const nextActions = checked
      ? [...visibleActions, actionId]
      : visibleActions.filter((id) => id !== actionId);

    const saved = await settings.updateBookmarkTradeActions(
      layout,
      compactTradeActionOptions
        .map((option) => option.id)
        .filter((id) => nextActions.includes(id))
    );

    if (!saved) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  function handleCompactTradeActionInput(event: Event, actionId: BookmarkTradeActionId) {
    handleCompactTradeActionChange(actionId, (event.currentTarget as HTMLInputElement).checked);
  }

  function noopPreviewAction() {}

  async function handleSidebarWidthReset() {
    if (!(await settings.updateSidebarWidth(DEFAULT_SIDEBAR_WIDTH))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function handleLanguageChange(language: AppLanguage) {
    const wasChinese =
      $settings.language === "zh-tw" || $settings.language === "zh-cn";
    const isChinese = language === "zh-tw" || language === "zh-cn";
    const reloadIntoChinese =
      $settings.translateTradeSite &&
      isChinese &&
      language !== $settings.language;
    const resetTradeSiteLanguage =
      $settings.translateTradeSite && wasChinese && !isChinese;

    if (reloadIntoChinese) {
      if (!(await prepareChineseTradeCache(language, currentChineseTradeVersion()))) {
        flashMessages.alert(translate($languageStore, "settings.saveFailed"));
        return;
      }
      if (!(await settings.updateLanguageForReload(language))) {
        flashMessages.alert(translate($languageStore, "settings.saveFailed"));
        return;
      }
      if (!(await reloadChineseTradeTabs(currentChineseTradeVersion()))) {
        window.location.reload();
      }
      return;
    }

    if (!(await settings.updateLanguage(language))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
      return;
    }

    if (resetTradeSiteLanguage) {
      if (wasChinese && !isChinese) {
        const version = currentChineseTradeVersion();
        const keys = version === "poe2"
          ? ["lscache-trade2stats", "lscache-trade2data", "lscache-trade2filters", "lscache-trade2items"]
          : ["lscache-tradestats", "lscache-tradedata", "lscache-tradefilters", "lscache-tradeitems"];
        for (const key of keys) {
          window.localStorage.removeItem(key);
          window.localStorage.removeItem(`${key}-cacheexpiration`);
        }
        window.localStorage.removeItem(chineseTradePageStorageFor(version).injected);
      }
      if (!(await reloadChineseTradeTabs(currentChineseTradeVersion()))) {
        window.location.reload();
      }
    }
  }

  async function handleTextSizeChange(textSize: TextSizePreference) {
    if (!(await settings.updateTextSize(textSize))) {
      flashMessages.alert(translate($languageStore, "settings.saveFailed"));
    }
  }

  async function exportBookmarksBackup() {
    const dataString = await extensionBackupService.generateBackupDataString();
    const blob = new Blob([dataString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `poe-trade-plus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    flashMessages.success(translate($languageStore, "bookmarks.exported"));
  }

  function restoreBookmarksBackup(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      const dataString = loadEvent.target?.result as string;
      const success = await extensionBackupService.restoreFromDataString(dataString);
      if (success) {
        await settings.reload();
        experimentalSettings.useVersion(tradeLocationService.current.version);
        flashMessages.success(translate($languageStore, "bookmarks.restored"));
      } else {
        flashMessages.alert(translate($languageStore, "bookmarks.restoreFailed"));
      }
      input.value = "";
    };
    reader.readAsText(file);
  }

  function toggleSwitchLabel(value: boolean) {
    return value ? translate($languageStore, "settings.on") : translate($languageStore, "settings.off");
  }

  function handleResultActionsVisibleChange(value: boolean) {
    experimentalSettings.setResultActionsVisible(value);
  }

  function handlePoe2CopyVisibleChange(value: boolean) {
    experimentalSettings.setPoe2CopyVisible(value);
  }

  function handleCoeVisibleChange(value: boolean) {
    experimentalSettings.setCoeVisible(value);
  }

  function handleCoeDesecratedModsChange(value: boolean) {
    experimentalSettings.setCoeDesecratedModsEnabled(value);
  }

  function handleWikiVisibleChange(value: boolean) {
    experimentalSettings.setWikiVisible(value);
  }

  function toggleLanguageMenu(event: MouseEvent) {
    event.stopPropagation();
    isLanguageMenuOpen = !isLanguageMenuOpen;
  }

  function selectLanguage(event: MouseEvent, language: AppLanguage) {
    event.stopPropagation();
    isLanguageMenuOpen = false;
    void handleLanguageChange(language);
  }

  function getLocalizedLanguageName(language: AppLanguage) {
    return localizedLanguageNames[$settings.language]?.[language] ?? localizedLanguageNames.en[language];
  }

  function handleDocumentClick(event: MouseEvent) {
    if (!languageSelectorEl?.contains(event.target as Node)) {
      isLanguageMenuOpen = false;
    }
  }

  function handleDocumentKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      isLanguageMenuOpen = false;
    }
  }

  onMount(async () => {
    await settings.load();
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleDocumentKeydown);
  });

  onDestroy(() => {
    document.removeEventListener("click", handleDocumentClick);
    document.removeEventListener("keydown", handleDocumentKeydown);
  });

  let selectedLanguage =
    $derived(languages.find((language) => language.code === $settings.language) ?? languages[0]);
  const currentLocation = tradeLocationService.locationStore;
  let isPoe2Trade = $derived($currentLocation.version === "2");
  const canShowValdoRewardPricing = $derived(
    !isPoe2Trade && !isNativeChineseTradeSite()
  );

  $effect(() => {
    if (tutorialStep && tutorialStepTabs[tutorialStep]) {
      activeTab = tutorialStepTabs[tutorialStep];
    }
  });
</script>

<div class="settings-page">
  <div class="settings-tabs" role="tablist" aria-label={translate($languageStore, "settings.tabs.label")}>
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        class="settings-tab"
        class:is-active={activeTab === tab.id}
        role="tab"
        aria-selected={activeTab === tab.id}
        onclick={() => activeTab = tab.id}
      >
        {translate($languageStore, tab.labelKey)}
      </button>
    {/each}
  </div>

  <div class="settings-grid" data-tutorial="settings-interface">
    {#if activeTab === "interface"}
      <section class="settings-section settings-section--feature settings-section--wide" data-tutorial="settings-language">
      <div class="section-heading">
        <h3 class="section-title">{translate($languageStore, "settings.languageTitle")}</h3>
      </div>
      <p class="section-description">{translate($languageStore, "settings.languageDescription")}</p>

      <div class="language-selector" bind:this={languageSelectorEl}>
        <div class="language-preview">
          <img class="language-flag" src={selectedLanguage.flag} alt={selectedLanguage.label} />
        </div>

        <div class="language-select-wrap language-select-wrap--custom">
          <button
            type="button"
            class="language-select"
            aria-haspopup="listbox"
            aria-expanded={isLanguageMenuOpen}
            onclick={toggleLanguageMenu}
          >
            <span class="language-select__flag-wrap">
              <img class="language-flag" src={selectedLanguage.flag} alt="" aria-hidden="true" />
            </span>
            <span class="language-select__copy">
              <span class="language-option__native">{selectedLanguage.label}</span>
              <span class="language-option__translated">{getLocalizedLanguageName(selectedLanguage.code)}</span>
            </span>
            <span class="language-select__chevron" aria-hidden="true">▾</span>
          </button>

          {#if isLanguageMenuOpen}
            <div class="language-menu" role="listbox" aria-label={translate($languageStore, "settings.languageTitle")}>
              {#each languages as language (language.code)}
                <button
                  type="button"
                  class="language-menu__item"
                  class:is-active={language.code === $settings.language}
                  role="option"
                  aria-selected={language.code === $settings.language}
                  onclick={(event) => selectLanguage(event, language.code)}
                >
                  <span class="language-menu__flag-wrap">
                    <img class="language-flag" src={language.flag} alt="" aria-hidden="true" />
                  </span>
                  <span class="language-option__native">{language.label}</span>
                  <span class="language-option__translated">{getLocalizedLanguageName(language.code)}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      </section>

      <section class="settings-section settings-section--wide">
        <div class="settings-section__header-row">
          <div class="section-heading">
            <h3 class="section-title">{translate($languageStore, "settings.autoFuzzyTitle")}</h3>
          </div>
          <ToggleRow
            checked={$settings.autoFuzzySearch}
            label={translate($languageStore, "settings.autoFuzzyTitle")}
            stateLabel={toggleSwitchLabel($settings.autoFuzzySearch)}
            onToggle={() => handleAutoFuzzySearchChange(!$settings.autoFuzzySearch)}
          />
        </div>
        <p class="section-description">{translate($languageStore, "settings.autoFuzzyDescription")}</p>
      </section>

      {#if canTranslateTradeSite}
        <section class="settings-section settings-section--wide">
          <div class="settings-section__header-row">
            <div class="section-heading">
              <h3 class="section-title">{translate($languageStore, "settings.tradeTranslationTitle")}</h3>
            </div>
            <ToggleRow
              checked={$settings.translateTradeSite}
              label={translate($languageStore, "settings.tradeTranslationTitle")}
              stateLabel={toggleSwitchLabel($settings.translateTradeSite)}
              onToggle={() => handleTradeSiteTranslationChange(!$settings.translateTradeSite)}
            />
          </div>
          <p class="section-description">{translate($languageStore, "settings.tradeTranslationDescription")}</p>
          <p class="section-description">{translate($languageStore, "settings.tradeTranslationHint")}</p>
        </section>
      {/if}

      <section class="settings-section settings-section--wide">
        <div class="section-heading">
          <h3 class="section-title">{translate($languageStore, "settings.textSizeTitle")}</h3>
        </div>
        <p class="section-description">{translate($languageStore, "settings.textSizeDescription")}</p>

        <div class="side-selector">
          {#each textSizeOptions as option (option.id)}
            <Button
              label={translate($languageStore, option.labelKey)}
              theme={$settings.textSize === option.id ? "gold" : "blue"}
              class="side-btn"
              onClick={() => handleTextSizeChange(option.id)}
            />
          {/each}
        </div>
      </section>

      <section class="settings-section settings-section--wide" data-tutorial="settings-sidebar">
      <div class="section-heading">
        <h3 class="section-title">{translate($languageStore, "settings.sidebarTitle")}</h3>
      </div>
      <p class="section-description">{translate($languageStore, "settings.sidebarDescription")}</p>
    
      <div class="side-selector">
        <Button 
          label={translate($languageStore, "settings.left")} 
          theme={$settings.sidebarSide === 'left' ? 'gold' : 'blue'}
          class="side-btn"
          onClick={() => handleSideChange('left')}
        />
        <Button 
          label={translate($languageStore, "settings.right")} 
          theme={$settings.sidebarSide === 'right' ? 'gold' : 'blue'}
          class="side-btn"
          onClick={() => handleSideChange('right')}
        />
        <Button
          label={translate($languageStore, "settings.resetWidth")}
          theme="blue"
          class="side-btn reset-btn"
          onClick={handleSidebarWidthReset}
        />
      </div>
      </section>

      <section class="settings-section settings-section--wide">
        <div class="settings-section__header-row">
          <div class="section-heading">
            <h3 class="section-title">{translate($languageStore, "settings.quickFiltersTitle")}</h3>
          </div>
          <ToggleRow
            checked={$settings.showQuickFilters}
            label={translate($languageStore, "settings.quickFiltersTitle")}
            stateLabel={toggleSwitchLabel($settings.showQuickFilters)}
            onToggle={() => handleQuickFiltersChange(!$settings.showQuickFilters)}
          />
        </div>
        <p class="section-description">{translate($languageStore, "settings.quickFiltersDescription")}</p>
        <div class="settings-row-list">
          {#if $settings.showQuickFilters}
            <div class="settings-placement">
              <div class="settings-placement__label">
                {translate($languageStore, "settings.quickFiltersPlacementTitle")}
              </div>
              <div class="side-selector side-selector--inline">
                <Button
                  label={translate($languageStore, "settings.quickFiltersPlacementPage")}
                  theme={$settings.quickFiltersPlacement === 'page' ? 'gold' : 'blue'}
                  class="side-btn"
                  onClick={() => handleQuickFiltersPlacementChange('page')}
                />
                <Button
                  label={translate($languageStore, "settings.quickFiltersPlacementSidebar")}
                  theme={$settings.quickFiltersPlacement === 'sidebar' ? 'gold' : 'blue'}
                  class="side-btn"
                  onClick={() => handleQuickFiltersPlacementChange('sidebar')}
                />
              </div>
            </div>
          {/if}
        </div>
      </section>

      <section class="settings-section settings-section--wide">
      <div class="section-heading">
        <h3 class="section-title">{translate($languageStore, "bookmarks.backupTitle")}</h3>
      </div>
      <p class="section-description">{translate($languageStore, "bookmarks.backupDescription")}</p>

      <div class="side-selector settings-actions-row">
        <Button
          label={translate($languageStore, "bookmarks.saveFile")}
          theme="gold"
          class="side-btn"
          onClick={exportBookmarksBackup}
        />
        <Button
          label={translate($languageStore, "bookmarks.restoreFile")}
          theme="gold"
          class="side-btn"
          onFileChange={restoreBookmarksBackup}
          fileAccept=".json,.txt"
        />
      </div>
      </section>

    {:else if activeTab === "sidebar"}
      <section class="settings-section settings-section--wide">
        <div class="section-heading">
          <h3 class="section-title">{translate($languageStore, "settings.sidebarModulesTitle")}</h3>
        </div>
        <p class="section-description">{translate($languageStore, "settings.sidebarModulesDescription")}</p>

        <div class="settings-row-list settings-row-list--spaced" data-tutorial="settings-bulk">
          <div class="settings-row">
            <div class="settings-row__copy">
              <div class="settings-row__title">{translate($languageStore, "settings.bulkTitle")}</div>
              <div class="settings-row__description">{translate($languageStore, "settings.bulkDescription")}</div>
            </div>
            <ToggleRow
              checked={$settings.showBulkSellers}
              label={translate($languageStore, "settings.bulkTitle")}
              stateLabel={toggleSwitchLabel($settings.showBulkSellers)}
              onToggle={() => handleBulkSellersChange(!$settings.showBulkSellers)}
            />
          </div>

          <div class="settings-row">
            <div class="settings-row__copy">
              <div class="settings-row__title">{translate($languageStore, "settings.pinnedTitle")}</div>
              <div class="settings-row__description">{translate($languageStore, "settings.pinnedDescription")}</div>
            </div>
            <ToggleRow checked={$settings.showPinnedItems} label={translate($languageStore, "settings.pinnedTitle")} stateLabel={toggleSwitchLabel($settings.showPinnedItems)} onToggle={() => handlePinnedItemsChange(!$settings.showPinnedItems)} />
          </div>

          <div class="settings-row" data-tutorial="settings-history">
            <div class="settings-row__copy">
              <div class="settings-row__title">{translate($languageStore, "settings.historyTitle")}</div>
              <div class="settings-row__description">{translate($languageStore, "settings.historyDescription")}</div>
            </div>
            <ToggleRow
              checked={$settings.showHistory}
              label={translate($languageStore, "settings.historyTitle")}
              stateLabel={toggleSwitchLabel($settings.showHistory)}
              onToggle={() => handleHistoryChange(!$settings.showHistory)}
            />
          </div>

        </div>
      </section>

    {:else if activeTab === "bookmarks"}
      <div class="settings-section-group" data-tutorial="settings-bookmarks">
      <section class="settings-section settings-section--wide">
        <div class="settings-section__header-row">
          <div class="section-heading">
            <h3 class="section-title">{translate($languageStore, "settings.bookmarkCategoriesTitle")}</h3>
          </div>
          <ToggleRow
            checked={$settings.bookmarkCategoriesEnabled}
            label={translate($languageStore, "settings.bookmarkCategoriesTitle")}
            stateLabel={toggleSwitchLabel($settings.bookmarkCategoriesEnabled)}
            onToggle={() => handleBookmarkCategoriesChange(!$settings.bookmarkCategoriesEnabled)}
          />
        </div>
        <p class="section-description">{translate($languageStore, "settings.bookmarkCategoriesDescription")}</p>
      </section>

      <section class="settings-section settings-section--wide settings-section--bookmarks-layout">
      <div class="section-heading">
        <h3 class="section-title">{translate($languageStore, "settings.compactActionsTitle")}</h3>
      </div>
      <p class="section-description">{translate($languageStore, "settings.compactActionsDescription")}</p>

      <div class="side-selector side-selector--bookmark-layout">
        <Button
          label={translate($languageStore, "settings.compactActionsDefault")}
          theme={$settings.compactActionsMenu ? 'blue' : 'gold'}
          class="side-btn side-btn--bookmark-layout"
          onClick={() => handleBookmarkLayoutChange(false)}
        />
        <Button
          label={translate($languageStore, "settings.compactActionsCompact")}
          theme={$settings.compactActionsMenu && !$settings.ultraCompactBookmarks ? 'gold' : 'blue'}
          class="side-btn side-btn--bookmark-layout"
          onClick={() => handleBookmarkLayoutChange(true)}
        />
        <Button
          label={translate($languageStore, "settings.compactActionsUltra")}
          theme={$settings.ultraCompactBookmarks ? 'gold' : 'blue'}
          class="side-btn side-btn--bookmark-layout"
          onClick={() => handleBookmarkLayoutChange(true, true)}
        />
      </div>

      <div class="compact-options">
        <div class="compact-options__heading">
          <div class="compact-options__title">{translate($languageStore, "settings.tradeActionsTitle")}</div>
        </div>
        <p class="section-description section-description--compact">{translate($languageStore, "settings.tradeActionsDescription")}</p>
        <div class="compact-options__grid">
          {#each compactTradeActionOptions as option (option.id)}
            <label
              class="compact-option"
              class:is-selected={getVisibleBookmarkTradeActions().includes(option.id)}
              title={translate($languageStore, option.labelKey)}
            >
              <input
                type="checkbox"
                checked={getVisibleBookmarkTradeActions().includes(option.id)}
                onchange={(event) => handleCompactTradeActionInput(event, option.id)}
                aria-label={translate($languageStore, option.labelKey)}
              />
              <span class="compact-option__icon" aria-hidden="true">
                <SvgIcon svg={option.icon} size={15} className="settings-option-svg" />
              </span>
            </label>
          {/each}
        </div>
      </div>

      <div class="bookmark-layout-preview" aria-label={translate($languageStore, "settings.bookmarkPreviewTitle")}>
        <div class="bookmark-layout-preview__heading">
          <div class="bookmark-layout-preview__copy">
            <div class="compact-options__title">{translate($languageStore, "settings.bookmarkPreviewTitle")}</div>
            <p class="section-description section-description--compact">
              {translate($languageStore, "settings.bookmarkPreviewDescription")}
            </p>
          </div>
          <span class="bookmark-layout-preview__mode">
            {translate(
              $languageStore,
              $settings.ultraCompactBookmarks
                ? "settings.compactActionsUltra"
                : $settings.compactActionsMenu
                  ? "settings.compactActionsCompact"
                : "settings.compactActionsDefault"
            )}
          </span>
        </div>

        <div class="bookmark-layout-preview__live">
          <BookmarkFolder
            folder={previewFolder}
            previewTrades={previewBookmarks}
            isExpanded={true}
            onToggleExpansion={() => {}}
            onArchiveEvent={() => {}}
            onDeleteEvent={() => {}} />
        </div>

        <div class="preview-folder bookmark-layout-preview__legacy">
          <div class="preview-folder__header">
            <span class="preview-folder__icon" aria-hidden="true"></span>
            <span class="preview-folder__title">{translate($languageStore, "settings.bookmarkPreviewFolder")}</span>
            <span class="preview-folder__chevron" aria-hidden="true">▼</span>
          </div>

          {#if $settings.bookmarkCategoriesEnabled}
            <div class="preview-category">
              <span class="preview-category__marker" aria-hidden="true"></span>
              <span>{translate($languageStore, "folder.noCategory")}</span>
            </div>
          {/if}

          <div class="preview-trades-list" class:is-ultra-compact={$settings.ultraCompactBookmarks}>
            <div class="preview-trade-item">
              <span class="preview-trade__drag" aria-hidden="true">≡</span>
              <div class="preview-trade__content">
                <div class="preview-trade__top">
                  <span class="preview-trade__title">{translate($languageStore, "settings.bookmarkPreviewTrade")}</span>
                  {#if $settings.compactActionsMenu}
                    <div class="preview-trade-actions preview-trade-actions--compact">
                      <TradeActionsMenu
                        trade={previewTrade}
                        onEdit={noopPreviewAction}
                        onReplace={noopPreviewAction}
                        onCopy={noopPreviewAction}
                        onOpenNewTab={noopPreviewAction}
                        onOpenLive={noopPreviewAction}
                        onToggleArchive={noopPreviewAction}
                        onToggle={noopPreviewAction}
                        onDelete={noopPreviewAction} />
                    </div>
                  {/if}
                </div>

                {#if !$settings.compactActionsMenu}
                  <div class="preview-trade__bottom">
                    <div class="preview-trade-actions">
                      <TradeActionsMenu
                        trade={previewTrade}
                        onEdit={noopPreviewAction}
                        onReplace={noopPreviewAction}
                        onCopy={noopPreviewAction}
                        onOpenNewTab={noopPreviewAction}
                        onOpenLive={noopPreviewAction}
                        onToggleArchive={noopPreviewAction}
                        onToggle={noopPreviewAction}
                        onDelete={noopPreviewAction} />
                    </div>
                  </div>
                {/if}
              </div>
            </div>
            <div class="preview-trade-item">
              <span class="preview-trade__drag" aria-hidden="true">≡</span>
              <div class="preview-trade__content">
                <div class="preview-trade__top">
                  <span class="preview-trade__title">{translate($languageStore, "settings.bookmarkPreviewTradeSecondary")}</span>
                  {#if $settings.compactActionsMenu}
                    <div class="preview-trade-actions preview-trade-actions--compact">
                      <TradeActionsMenu
                        trade={previewTradeSecondary}
                        onEdit={noopPreviewAction}
                        onReplace={noopPreviewAction}
                        onCopy={noopPreviewAction}
                        onOpenNewTab={noopPreviewAction}
                        onOpenLive={noopPreviewAction}
                        onToggleArchive={noopPreviewAction}
                        onToggle={noopPreviewAction}
                        onDelete={noopPreviewAction} />
                    </div>
                  {/if}
                </div>

                {#if !$settings.compactActionsMenu}
                  <div class="preview-trade__bottom">
                    <div class="preview-trade-actions">
                      <TradeActionsMenu
                        trade={previewTradeSecondary}
                        onEdit={noopPreviewAction}
                        onReplace={noopPreviewAction}
                        onCopy={noopPreviewAction}
                        onOpenNewTab={noopPreviewAction}
                        onOpenLive={noopPreviewAction}
                        onToggleArchive={noopPreviewAction}
                        onToggle={noopPreviewAction}
                        onDelete={noopPreviewAction} />
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>
      </div>

    {:else if activeTab === "results"}
      <section class="settings-section settings-section--wide" data-tutorial="settings-results">
      <div class="section-heading">
        <h3 class="section-title">{translate($languageStore, "settings.resultsTitle")}</h3>
      </div>
      <div class="settings-row-list">
        <div class="settings-row" data-tutorial="settings-equivalent">
          <div class="settings-row__copy">
            <div class="settings-row__title">{translate($languageStore, "settings.equivalentTitle")}</div>
            <div class="settings-row__description">{translate($languageStore, "settings.equivalentDescription")}</div>
            <div class="settings-row__hint settings-row__hint--actions">
              <span>{translate($languageStore, "settings.equivalentSource")}</span>
              <button
                type="button"
                class="mini-action"
                onclick={handleEquivalentPricingRefresh}
                disabled={isRefreshingEquivalentRatios}
              >
                {translate(
                  $languageStore,
                  isRefreshingEquivalentRatios
                    ? "settings.equivalentRefreshLoading"
                    : "settings.equivalentRefresh"
                )}
              </button>
            </div>
          </div>
          <ToggleRow
            checked={$settings.showEquivalentPricing}
            label={translate($languageStore, "settings.equivalentTitle")}
            stateLabel={toggleSwitchLabel($settings.showEquivalentPricing)}
            onToggle={() => handleEquivalentPricingChange(!$settings.showEquivalentPricing)}
          />
        </div>

        {#if canShowValdoRewardPricing}
          <div class="settings-row">
            <div class="settings-row__copy">
              <div class="settings-row__title">{translate($languageStore, "settings.valdoRewardPricingTitle")}</div>
              <div class="settings-row__description">{translate($languageStore, "settings.valdoRewardPricingDescription")}</div>
            </div>
            <ToggleRow
              checked={$settings.showValdoRewardPricing}
              label={translate($languageStore, "settings.valdoRewardPricingTitle")}
              stateLabel={toggleSwitchLabel($settings.showValdoRewardPricing)}
              onToggle={() => handleValdoRewardPricingChange(!$settings.showValdoRewardPricing)}
            />
          </div>
        {/if}

        <div class="settings-row">
          <div class="settings-row__copy">
            <div class="settings-row__title">{translate($languageStore, "settings.resultActionsTitle")}</div>
            <div class="settings-row__description">{translate($languageStore, "settings.resultActionsBody")}</div>
          </div>
          <ToggleRow
            checked={$experimentalSettings}
            label={translate($languageStore, "settings.resultActionsTitle")}
            stateLabel={toggleSwitchLabel($experimentalSettings)}
            onToggle={() => handleResultActionsVisibleChange(!$experimentalSettings)}
          />
        </div>

        <div class="settings-row">
          <div class="settings-row__copy">
            <div class="settings-row__title">{translate($languageStore, "settings.highlightedModColorTitle")}</div>
            <div class="settings-row__description">{translate($languageStore, "settings.highlightedModColorBody")}</div>
          </div>
          <div class="highlight-color-control">
            <button
              class="highlight-color-picker"
              type="button"
              aria-label={translate($languageStore, "settings.highlightedModColorTitle")}
              aria-expanded={isHighlightedModColorPickerOpen}
              onclick={toggleHighlightedModColorPicker}
            >
              <span style:background-color={$settings.highlightedModColor}></span>
            </button>
            {#if isHighlightedModColorPickerOpen}
              <div class="highlight-color-popover">
                <div class="highlight-color-presets">
                  {#each highlightedModColorPresets as color}
                    <button
                      class:active-color={color === $settings.highlightedModColor}
                      type="button"
                      aria-label={color}
                      onclick={() => selectHighlightedModColor(color)}
                    >
                      <span style:background-color={color}></span>
                    </button>
                  {/each}
                </div>
                <div class="highlight-color-hex">
                  <input
                    bind:value={draftHighlightedModColor}
                    aria-label={translate($languageStore, "settings.highlightedModColorTitle")}
                    maxlength="7"
                    onkeydown={(event) => event.key === "Enter" && void commitHighlightedModColor()}
                    onchange={commitHighlightedModColor}
                  />
                  <span style:background-color={draftHighlightedModColor}></span>
                </div>
              </div>
            {/if}
          </div>
        </div>

        {#if isPoe2Trade}
          <div class="settings-row">
            <div class="settings-row__copy">
              <div class="settings-row__title">{translate($languageStore, "settings.poe2CopyTitle")}</div>
              <div class="settings-row__description">{translate($languageStore, "settings.poe2CopyBody")}</div>
            </div>
            <ToggleRow
              checked={$poe2CopyButtonSetting}
              label={translate($languageStore, "settings.poe2CopyTitle")}
              stateLabel={toggleSwitchLabel($poe2CopyButtonSetting)}
              onToggle={() => handlePoe2CopyVisibleChange(!$poe2CopyButtonSetting)}
            />
          </div>

          <div class="settings-row">
            <div class="settings-row__copy">
              <div class="settings-row__title">{translate($languageStore, "settings.magebloodLegacyTitle")}</div>
              <div class="settings-row__description">{translate($languageStore, "settings.magebloodLegacyBody")}</div>
            </div>
            <ToggleRow
              checked={$settings.showMagebloodLegacyDescriptions}
              label={translate($languageStore, "settings.magebloodLegacyTitle")}
              stateLabel={toggleSwitchLabel($settings.showMagebloodLegacyDescriptions)}
              onToggle={() => handleMagebloodLegacyDescriptionsChange(!$settings.showMagebloodLegacyDescriptions)}
            />
          </div>
        {/if}

        <div class="settings-row">
          <div class="settings-row__copy">
            <div class="settings-row__title">{translate($languageStore, "settings.coeTitle")}</div>
            <div class="settings-row__description">{translate($languageStore, "settings.coeBody")}</div>
          </div>
          <ToggleRow
            checked={$coeButtonSetting}
            label={translate($languageStore, "settings.coeTitle")}
            stateLabel={toggleSwitchLabel($coeButtonSetting)}
            onToggle={() => handleCoeVisibleChange(!$coeButtonSetting)}
          />
        </div>

        {#if $coeButtonSetting}
          <div class="settings-row">
            <div class="settings-row__copy">
              <div class="settings-row__title">{translate($languageStore, "settings.coeDesecratedModsTitle")}</div>
              <div class="settings-row__description">{translate($languageStore, "settings.coeDesecratedModsBody")}</div>
            </div>
            <ToggleRow
              checked={$coeDesecratedModsSetting}
              label={translate($languageStore, "settings.coeDesecratedModsTitle")}
              stateLabel={toggleSwitchLabel($coeDesecratedModsSetting)}
              onToggle={() => handleCoeDesecratedModsChange(!$coeDesecratedModsSetting)}
            />
          </div>
        {/if}

        <div class="settings-row">
          <div class="settings-row__copy">
            <div class="settings-row__title">{translate($languageStore, "settings.wikiTitle")}</div>
            <div class="settings-row__description">{translate($languageStore, "settings.wikiBody")}</div>
          </div>
          <ToggleRow
            checked={$wikiButtonSetting}
            label={translate($languageStore, "settings.wikiTitle")}
            stateLabel={toggleSwitchLabel($wikiButtonSetting)}
            onToggle={() => handleWikiVisibleChange(!$wikiButtonSetting)}
          />
        </div>
      </div>
      </section>
    {/if}
  </div>
</div>

<style>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 5px;
  color: #eeeeee;
  animation: fade-in 0.3s ease;
}

.highlight-color-control {
  position: relative;
  flex: 0 0 auto;
}

.highlight-color-picker {
  width: 38px;
  height: 32px;
  padding: 4px;
  border: 1px solid rgba(163, 141, 109, 0.34);
  border-radius: 6px;
  background: rgba(163, 141, 109, 0.06);
  cursor: pointer;
}
.highlight-color-picker:hover,
.highlight-color-picker:focus-visible {
  border-color: #a38d6d;
  outline: none;
}
.highlight-color-picker span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 3px;
}
.highlight-color-popover {
  position: absolute;
  z-index: 20;
  top: calc(100% + 6px);
  right: 0;
  width: 188px;
  padding: 10px;
  border: 1px solid rgba(163, 141, 109, 0.34);
  border-radius: 7px;
  background: #171512;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.42);
}
.highlight-color-presets {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}
.highlight-color-presets button {
  aspect-ratio: 1;
  padding: 2px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
.highlight-color-presets button:hover,
.highlight-color-presets button:focus-visible,
.highlight-color-presets button.active-color {
  border-color: #a38d6d;
  outline: none;
}
.highlight-color-presets span,
.highlight-color-hex > span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 2px;
}
.highlight-color-hex {
  display: grid;
  grid-template-columns: 1fr 24px;
  gap: 7px;
  align-items: center;
  margin-top: 10px;
}
.highlight-color-hex input {
  min-width: 0;
  height: 28px;
  padding: 0 7px;
  border: 1px solid rgba(238, 238, 238, 0.12);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.28);
  color: #eeeeee;
  font: inherit;
  text-transform: uppercase;
}
.highlight-color-hex input:focus {
  border-color: #a38d6d;
  outline: none;
}
.highlight-color-hex > span {
  height: 24px;
  border: 1px solid rgba(238, 238, 238, 0.18);
}

.settings-grid {
  display: grid;
  gap: 14px;
}

.settings-section-group {
  display: grid;
  gap: 14px;
}

.settings-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(238, 238, 238, 0.07);
  border-radius: 6px;
  background: rgba(238, 238, 238, 0.025);
}

.settings-tab {
  min-width: 0;
  min-height: 30px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: rgba(238, 238, 238, 0.62);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(10px * var(--bt-text-scale, 1));
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}
.settings-tab:hover, .settings-tab:focus-visible {
  border-color: rgba(163, 141, 109, 0.22);
  background: rgba(163, 141, 109, 0.06);
  color: rgba(238, 238, 238, 0.88);
  outline: none;
}
.settings-tab.is-active {
  border-color: rgba(163, 141, 109, 0.34);
  background: rgba(163, 141, 109, 0.1);
  color: #a38d6d;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.settings-section {
  position: relative;
  background: linear-gradient(180deg, rgba(238, 238, 238, 0.03), rgba(238, 238, 238, 0.015)), rgba(238, 238, 238, 0.02);
  border: 1px solid rgba(238, 238, 238, 0.07);
  padding: 16px;
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(238, 238, 238, 0.02);
}

.settings-section--feature {
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.08), rgba(163, 141, 109, 0.02)), rgba(238, 238, 238, 0.02);
  border-color: rgba(163, 141, 109, 0.12);
}

.section-title {
  margin: 0;
  font-family: "FontinSmallcaps", serif;
  font-size: calc(14px * var(--bt-text-scale, 1));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #a38d6d;
}

.settings-section__header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.section-heading {
  position: relative;
  width: fit-content;
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  min-width: 0;
}

.settings-section__header-row .section-heading {
  margin-bottom: 0;
}

.section-heading:has(+ .section-description)::after,
.settings-section__header-row:has(+ .section-description) .section-heading::after,
.compact-options__heading:has(+ .section-description)::after,
.bookmark-layout-preview__heading > div:has(.section-description)::after,
.settings-row__copy:has(.settings-row__description)::after {
  content: "?";
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  margin-left: 8px;
  border: 1px solid rgba(163, 141, 109, 0.22);
  border-radius: 999px;
  background: rgba(163, 141, 109, 0.06);
  color: rgba(196, 177, 140, 0.86);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(10px * var(--bt-text-scale, 1));
  line-height: 1;
}

.settings-row__copy:has(.settings-row__description)::after {
  grid-column: 2;
  grid-row: 1;
}

.section-description,
.settings-row__description {
  position: absolute;
  z-index: 8;
  width: min(320px, 100vw - 44px);
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgba(163, 141, 109, 0.22);
  border-radius: 6px;
  background: #11100d;
  color: rgba(238, 238, 238, 0.82);
  box-shadow: 0 12px 26px rgba(5, 5, 5, 0.44);
  font-size: calc(11px * var(--bt-text-scale, 1));
  line-height: 1.45;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.section-description {
  top: 40px;
  left: 16px;
}

.section-description--compact {
  margin: 0;
}

.compact-options,
.bookmark-layout-preview__heading > div {
  position: relative;
}

.compact-options .section-description,
.bookmark-layout-preview__heading .section-description {
  top: calc(100% + 8px);
  left: 0;
}

.section-heading:hover + .section-description,
.section-heading:focus-within + .section-description,
.settings-section__header-row:hover + .section-description,
.settings-section__header-row:focus-within + .section-description,
.compact-options__heading:hover + .section-description,
.compact-options__heading:focus-within + .section-description,
.bookmark-layout-preview__heading > div:hover .section-description,
.bookmark-layout-preview__heading > div:focus-within .section-description {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.settings-section--bookmarks-layout {
  text-align: left;
}

.settings-row-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-row-list--spaced {
  margin-top: 12px;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 0;
  border-top: 1px solid rgba(238, 238, 238, 0.07);
}

.settings-row:first-child {
  padding-top: 0;
  border-top: none;
}

.settings-row:last-child {
  padding-bottom: 0;
}

.settings-row__copy {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, max-content) auto;
  align-items: center;
  justify-content: start;
  column-gap: 8px;
  row-gap: 4px;
}

.settings-row__title {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  color: rgba(238, 238, 238, 0.94);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(12px * var(--bt-text-scale, 1));
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.settings-row__description {
  top: calc(100% + 8px);
  left: 0;
}

.settings-row__copy:hover .settings-row__description,
.settings-row__copy:focus-within .settings-row__description {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.settings-row__hint {
  grid-column: 1/-1;
  grid-row: 2;
  margin-top: 6px;
  color: rgba(163, 141, 109, 0.72);
  font-size: calc(10px * var(--bt-text-scale, 1));
  line-height: 1.45;
}

.settings-row__hint--actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid rgba(163, 141, 109, 0.18);
  border-radius: 4px;
  background: rgba(163, 141, 109, 0.07);
  color: rgba(196, 177, 140, 0.92);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(10px * var(--bt-text-scale, 1));
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}
.mini-action:hover, .mini-action:focus-visible {
  border-color: rgba(163, 141, 109, 0.34);
  background: rgba(163, 141, 109, 0.12);
  color: #eeeeee;
  outline: none;
}
.mini-action:disabled {
  opacity: 0.65;
  cursor: wait;
}

.side-selector {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.side-selector--bookmark-layout {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  margin-top: 18px;
}

.settings-actions-row {
  margin-top: 14px;
}

:global(.side-btn) {
  flex: 1;
  min-width: 0;
}

:global(.side-btn--bookmark-layout) {
  flex: 1 1 0;
  min-width: 0;
}

:global(.reset-btn) {
  flex: 1.35;
}

.language-selector {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  width: 100%;
}

.language-preview,
.language-select {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 34px;
  border: 1px solid rgba(163, 141, 109, 0.18);
  border-radius: 3px;
  background: rgba(238, 238, 238, 0.03);
  color: rgba(238, 238, 238, 0.82);
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}
.language-preview:hover,
.language-select:hover {
  background: rgba(163, 141, 109, 0.07);
  border-color: rgba(163, 141, 109, 0.34);
  color: #eeeeee;
}

.language-preview {
  justify-content: center;
  padding: 0;
}

.language-select-wrap {
  position: relative;
}

.language-select {
  min-width: 0;
  justify-content: flex-start;
  gap: 10px;
  padding: 0 10px;
  cursor: pointer;
  background-color: rgba(238, 238, 238, 0.03);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(11px * var(--bt-text-scale, 1));
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.language-select:focus-visible {
  border-color: rgba(163, 141, 109, 0.45);
  background: rgba(163, 141, 109, 0.08);
  color: #a38d6d;
  box-shadow: 0 0 0 1px rgba(163, 141, 109, 0.14);
}

.language-select__flag-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.language-select__copy {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: baseline;
  gap: 8px;
  justify-content: space-between;
}

.language-select__chevron {
  flex: 0 0 auto;
  margin-left: auto;
  color: rgba(163, 141, 109, 0.72);
  font-size: calc(11px * var(--bt-text-scale, 1));
}

.language-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border: 1px solid rgba(163, 141, 109, 0.18);
  border-radius: 4px;
  background: #14110d;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.32);
}

.language-menu__item {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: rgba(238, 238, 238, 0.02);
  color: rgba(238, 238, 238, 0.82);
  cursor: pointer;
  text-align: left;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}
.language-menu__item:hover, .language-menu__item.is-active {
  background: rgba(163, 141, 109, 0.07);
  border-color: rgba(163, 141, 109, 0.28);
  color: #eeeeee;
}

.language-menu__flag-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.language-option__native,
.language-option__translated {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "FontinSmallcaps", serif;
  font-size: calc(11px * var(--bt-text-scale, 1));
  letter-spacing: 0.05em;
}

.language-option__native {
  font-weight: 600;
  text-transform: uppercase;
}

.language-option__translated {
  color: rgba(163, 141, 109, 0.72);
  text-align: right;
}

.language-flag {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  object-fit: cover;
  border-radius: 999px;
  border: 1px solid rgba(238, 238, 238, 0.16);
  background: rgba(238, 238, 238, 0.04);
}

.compact-options {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(238, 238, 238, 0.08);
}

.compact-options__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.compact-options__title {
  font-family: "FontinSmallcaps", serif;
  font-size: calc(11px * var(--bt-text-scale, 1));
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(163, 141, 109, 0.9);
}

.compact-options__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.compact-option {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(238, 238, 238, 0.08);
  border-radius: 4px;
  background: rgba(5, 5, 5, 0.26);
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}
.compact-option input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.compact-option:hover {
  border-color: rgba(163, 141, 109, 0.34);
  background: rgba(163, 141, 109, 0.08);
  transform: translateY(-1px);
}
.compact-option:focus-within {
  border-color: rgba(163, 141, 109, 0.5);
  box-shadow: 0 0 0 1px rgba(163, 141, 109, 0.2), 0 0 0 3px rgba(163, 141, 109, 0.1);
}
.compact-option.is-selected {
  border-color: rgba(163, 141, 109, 0.38);
  background: rgba(54, 42, 28, 0.96);
  color: #e2b56e;
}

.compact-option__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  color: rgba(238, 238, 238, 0.84);
}

.compact-option__icon :global(.settings-option-svg) {
  width: 15px;
  height: 15px;
  min-width: 15px;
  min-height: 15px;
  display: block;
  overflow: visible;
  stroke-width: 1.7;
}

.settings-placement {
  margin-top: -2px;
  padding: 10px 0 12px;
  border-top: 1px solid rgba(238, 238, 238, 0.07);
}

.settings-placement__label {
  color: rgba(163, 141, 109, 0.78);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(10px * var(--bt-text-scale, 1));
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.side-selector--inline {
  margin-top: 8px;
}

.bookmark-layout-preview {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(238, 238, 238, 0.08);
}

.bookmark-layout-preview__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.bookmark-layout-preview__live {
  pointer-events: none;
}

.bookmark-layout-preview__legacy {
  display: none;
}

.bookmark-layout-preview__copy {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bookmark-layout-preview__mode {
  flex: 0 0 auto;
  min-height: 22px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(163, 141, 109, 0.22);
  border-radius: 999px;
  background: rgba(163, 141, 109, 0.07);
  color: rgba(196, 177, 140, 0.92);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(10px * var(--bt-text-scale, 1));
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.preview-folder {
  overflow: hidden;
  border: 1px solid rgba(163, 141, 109, 0.14);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.035), rgba(163, 141, 109, 0.012)), rgba(5, 5, 5, 0.4);
  box-shadow: inset 0 1px 0 rgba(238, 238, 238, 0.02), 0 10px 22px rgba(5, 5, 5, 0.2);
}

.preview-category {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 30px;
  padding: 4px 10px;
  border-bottom: 1px solid rgba(163, 141, 109, 0.1);
  background: rgba(5, 5, 5, 0.22);
  color: rgba(196, 177, 140, 0.88);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(10px * var(--bt-text-scale, 1));
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.preview-category__marker {
  width: 7px;
  height: 7px;
  border: 1px solid rgba(196, 177, 140, 0.62);
  border-radius: 999px;
  background: rgba(163, 141, 109, 0.24);
}

.preview-folder__header {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 43px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(163, 141, 109, 0.1);
  background: linear-gradient(180deg, rgba(26, 42, 58, 0.92), rgba(15, 28, 46, 0.96)), #0f1c2e;
}

.preview-folder__icon {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  border-radius: 4px;
  border: 1px solid rgba(163, 141, 109, 0.18);
  background: radial-gradient(circle at 50% 42%, rgba(196, 177, 140, 0.72) 0 3px, transparent 4px), linear-gradient(135deg, rgba(163, 141, 109, 0.28), rgba(5, 5, 5, 0.18));
}

.preview-folder__title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(238, 238, 238, 0.96);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(14px * var(--bt-text-scale, 1));
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.preview-folder__chevron {
  color: rgba(196, 177, 140, 0.78);
  font-size: calc(11px * var(--bt-text-scale, 1));
}

.preview-trades-list {
  padding: 10px;
  background: linear-gradient(180deg, rgba(238, 238, 238, 0.015), rgba(238, 238, 238, 0)), rgba(5, 5, 5, 0.36);
}

.preview-trade-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(238, 238, 238, 0.06);
  border-radius: 6px;
  background: rgba(5, 5, 5, 0.34);
}

.preview-trade__drag {
  width: 16px;
  flex: 0 0 16px;
  color: rgba(238, 238, 238, 0.3);
  font-size: calc(15px * var(--bt-text-scale, 1));
  text-align: center;
}

.preview-trade__content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-trade__top,
.preview-trade__bottom {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.preview-trade__top {
  justify-content: space-between;
}

.preview-trade__bottom {
  justify-content: flex-start;
}

.preview-trade__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #eeeeee;
  font-size: calc(13px * var(--bt-text-scale, 1));
  line-height: 1.2;
}

.preview-trade-actions {
  display: flex;
  align-items: center;
  min-width: 0;
  flex-shrink: 0;
}

.preview-trade-actions--compact {
  margin-left: auto;
}

.preview-trades-list.is-ultra-compact {
  padding: 4px;
}
.preview-trades-list.is-ultra-compact .preview-trade-item {
  gap: 6px;
  min-height: 29px;
  padding: 4px 7px;
  border-radius: 2px;
}
.preview-trades-list.is-ultra-compact .preview-trade__drag {
  width: 12px;
  flex-basis: 12px;
  font-size: calc(12px * var(--bt-text-scale, 1));
}
.preview-trades-list.is-ultra-compact .preview-trade__content {
  gap: 0;
}
.preview-trades-list.is-ultra-compact .preview-trade__top {
  gap: 4px;
}
.preview-trades-list.is-ultra-compact .preview-trade__title {
  font-size: calc(12px * var(--bt-text-scale, 1));
  line-height: 1.1;
}

@media (max-width: 430px) {
  .settings-tabs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .settings-grid {
    gap: 12px;
  }
  .settings-row {
    flex-direction: column;
    align-items: stretch;
  }
  .bookmark-layout-preview__heading {
    flex-direction: column;
    align-items: stretch;
  }
}
@media (prefers-reduced-motion: reduce) {
  .settings-page,
  .language-select,
  .language-menu__item,
  .compact-option {
    animation: none !important;
    transition: none !important;
  }
}
@media (min-width: 520px) {
  .settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .settings-section--wide {
    grid-column: 1/-1;
  }
  .settings-section-group {
    grid-column: 1/-1;
  }
}
</style>
