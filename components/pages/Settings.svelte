<script lang="ts">
  import { languageStore, translate, type AppLanguage } from "../../lib/services/i18n";
  import { bookmarksService } from "../../lib/services/bookmarks";
  import { flashMessages } from "../../lib/services/flash";
  import { settings, type BookmarkTradeActionId, type SidebarSide } from "../../lib/services/settings";
  import Button from "../Button.svelte";
  import { onDestroy, onMount } from "svelte";
  import flagBR from "data-base64:../../assets/BR.png";
  import flagDE from "data-base64:../../assets/DE.png";
  import flagES from "data-base64:../../assets/ES.png";
  import flagFR from "data-base64:../../assets/FR.png";
  import flagGB from "data-base64:../../assets/GB.png";
  import flagJP from "data-base64:../../assets/JP.png";
  import flagKR from "data-base64:../../assets/KR.png";
  import flagRU from "data-base64:../../assets/RU.png";
  import flagTH from "data-base64:../../assets/TH.png";
  import editIcon from "data-text:lucide-static/icons/pencil.svg";
  import replaceIcon from "data-text:lucide-static/icons/refresh-cw.svg";
  import copyIcon from "data-text:lucide-static/icons/copy.svg";
  import liveIcon from "data-text:lucide-static/icons/activity.svg";
  import toggleIcon from "data-text:lucide-static/icons/check.svg";
  import deleteIcon from "data-text:lucide-static/icons/trash-2.svg";

  export let onOpenTutorial: () => void = () => {};

  const DEFAULT_SIDEBAR_WIDTH = 450;
  const normalizeSettingsIcon = (svg: string) =>
    svg.replace(/<svg\b([^>]*)>/, (_match, attrs) => {
      const nextAttrs = attrs
        .replace(/\sclass="[^"]*"/g, "")
        .replace(/\swidth="[^"]*"/g, "")
        .replace(/\sheight="[^"]*"/g, "")
        .replace(/\sviewBox="[^"]*"/g, "")
        .trim();

      return `<svg ${nextAttrs} viewBox="-2 -2 28 28" class="settings-option-svg">`;
    });

  const compactTradeActionOptions: Array<{ id: BookmarkTradeActionId; labelKey: string; icon: string }> = [
    { id: "edit", labelKey: "folder.editSearchName", icon: normalizeSettingsIcon(editIcon) },
    { id: "replace", labelKey: "folder.replaceCurrentSearch", icon: normalizeSettingsIcon(replaceIcon) },
    { id: "copy", labelKey: "folder.copyUrl", icon: normalizeSettingsIcon(copyIcon) },
    { id: "openLive", labelKey: "folder.openLiveSearch", icon: normalizeSettingsIcon(liveIcon) },
    { id: "toggle", labelKey: "settings.compactTradeActionToggle", icon: normalizeSettingsIcon(toggleIcon) },
    { id: "delete", labelKey: "folder.deleteTrade", icon: normalizeSettingsIcon(deleteIcon) }
  ];
  const languages: Array<{ code: AppLanguage; label: string; flag: string }> = [
    { code: "en", label: "English", flag: flagGB },
    { code: "es", label: "Español", flag: flagES },
    { code: "pt", label: "Português", flag: flagBR },
    { code: "ru", label: "Русский", flag: flagRU },
    { code: "th", label: "ไทย", flag: flagTH },
    { code: "de", label: "Deutsch", flag: flagDE },
    { code: "fr", label: "Français", flag: flagFR },
    { code: "ja", label: "日本語", flag: flagJP },
    { code: "ko", label: "한국어", flag: flagKR }
  ];

  const localizedLanguageNames: Record<AppLanguage, Record<AppLanguage, string>> = {
    en: { en: "English", es: "Spanish", pt: "Portuguese", ru: "Russian", th: "Thai", de: "German", fr: "French", ja: "Japanese", ko: "Korean" },
    es: { en: "Inglés", es: "Español", pt: "Portugués", ru: "Ruso", th: "Tailandés", de: "Alemán", fr: "Francés", ja: "Japonés", ko: "Coreano" },
    pt: { en: "Inglês", es: "Espanhol", pt: "Português", ru: "Russo", th: "Tailandês", de: "Alemão", fr: "Francês", ja: "Japonês", ko: "Coreano" },
    ru: { en: "Английский", es: "Испанский", pt: "Португальский", ru: "Русский", th: "Тайский", de: "Немецкий", fr: "Французский", ja: "Японский", ko: "Корейский" },
    th: { en: "อังกฤษ", es: "สเปน", pt: "โปรตุเกส", ru: "รัสเซีย", th: "ไทย", de: "เยอรมัน", fr: "ฝรั่งเศส", ja: "ญี่ปุ่น", ko: "เกาหลี" },
    de: { en: "Englisch", es: "Spanisch", pt: "Portugiesisch", ru: "Russisch", th: "Thailändisch", de: "Deutsch", fr: "Französisch", ja: "Japanisch", ko: "Koreanisch" },
    fr: { en: "Anglais", es: "Espagnol", pt: "Portugais", ru: "Russe", th: "Thaï", de: "Allemand", fr: "Français", ja: "Japonais", ko: "Coréen" },
    ja: { en: "英語", es: "スペイン語", pt: "ポルトガル語", ru: "ロシア語", th: "タイ語", de: "ドイツ語", fr: "フランス語", ja: "日本語", ko: "韓国語" },
    ko: { en: "영어", es: "스페인어", pt: "포르투갈어", ru: "러시아어", th: "태국어", de: "독일어", fr: "프랑스어", ja: "일본어", ko: "한국어" }
  };

  let isLanguageMenuOpen = false;
  let languageSelectorEl: HTMLDivElement | null = null;

  async function handleSideChange(side: SidebarSide) {
    await settings.updateSide(side);
  }

  async function handleEquivalentPricingChange(showEquivalentPricing: boolean) {
    await settings.updateEquivalentPricingVisibility(showEquivalentPricing);
  }

  async function handleBulkSellersChange(showBulkSellers: boolean) {
    await settings.updateBulkSellersVisibility(showBulkSellers);
  }

  async function handleHistoryChange(showHistory: boolean) {
    await settings.updateHistoryVisibility(showHistory);
  }

  async function handleFinerFiltersChange(showFinerFilters: boolean) {
    await settings.updateFinerFiltersVisibility(showFinerFilters);
  }

  async function handleCompactActionsMenuChange(compactActionsMenu: boolean) {
    await settings.updateCompactActionsMenu(compactActionsMenu);
  }

  async function handleCompactTradeActionChange(actionId: BookmarkTradeActionId, checked: boolean) {
    const nextActions = checked
      ? [...$settings.compactBookmarkTradeActions, actionId]
      : $settings.compactBookmarkTradeActions.filter((id) => id !== actionId);

    await settings.updateCompactBookmarkTradeActions(
      compactTradeActionOptions
        .map((option) => option.id)
        .filter((id) => nextActions.includes(id))
    );
  }

  function handleCompactTradeActionInput(event: Event, actionId: BookmarkTradeActionId) {
    handleCompactTradeActionChange(actionId, (event.currentTarget as HTMLInputElement).checked);
  }

  async function handleSidebarWidthReset() {
    await settings.updateSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  }

  async function handleLanguageChange(language: AppLanguage) {
    await settings.updateLanguage(language);
  }

  async function exportBookmarksBackup() {
    const dataString = await bookmarksService.generateBackupDataString();
    const blob = new Blob([dataString], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `poe-trade-plus-backup-${new Date().toISOString().slice(0, 10)}.txt`;
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
      const success = await bookmarksService.restoreFromDataString(dataString);
      if (success) {
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

  $: selectedLanguage =
    languages.find((language) => language.code === $settings.language) ?? languages[0];
</script>

<div class="settings-page">
  <div class="settings-grid">
    <section class="settings-section settings-section--feature settings-section--wide" data-tutorial="settings-language">
      <div class="section-heading">
        <h3 class="section-title">{translate($languageStore, "settings.languageTitle")}</h3>
      </div>
      <p class="section-description">{translate($languageStore, "settings.languageDescription")}</p>

      <div class="language-selector" bind:this={languageSelectorEl}>
        <div class="language-preview">
          <img class="language-flag" src={selectedLanguage.flag} alt={selectedLanguage.label} />
        </div>

        <div class="language-select-wrap">
          <button
            type="button"
            class="language-select"
            aria-haspopup="listbox"
            aria-expanded={isLanguageMenuOpen}
            on:click={toggleLanguageMenu}
          >
            <span class="language-option__native">{selectedLanguage.label}</span>
            <span class="language-option__translated">{getLocalizedLanguageName(selectedLanguage.code)}</span>
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
                  on:click={(event) => selectLanguage(event, language.code)}
                >
                  <span class="language-menu__flag-wrap">
                    <img class="language-flag" src={language.flag} alt={language.label} />
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

    <section class="settings-section settings-section--wide" data-tutorial="settings-bookmarks">
      <div class="section-heading">
        <h3 class="section-title">{translate($languageStore, "settings.compactActionsTitle")}</h3>
      </div>
      <p class="section-description">{translate($languageStore, "settings.compactActionsDescription")}</p>

      <div class="side-selector">
        <Button
          label={translate($languageStore, "settings.compactActionsDefault")}
          theme={$settings.compactActionsMenu ? 'blue' : 'gold'}
          class="side-btn"
          onClick={() => handleCompactActionsMenuChange(false)}
        />
        <Button
          label={translate($languageStore, "settings.compactActionsCompact")}
          theme={$settings.compactActionsMenu ? 'gold' : 'blue'}
          class="side-btn"
          onClick={() => handleCompactActionsMenuChange(true)}
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
              class:is-selected={$settings.compactBookmarkTradeActions.includes(option.id)}
              title={translate($languageStore, option.labelKey)}
            >
              <input
                type="checkbox"
                checked={$settings.compactBookmarkTradeActions.includes(option.id)}
                on:change={(event) => handleCompactTradeActionInput(event, option.id)}
                aria-label={translate($languageStore, option.labelKey)}
              />
              <span class="compact-option__icon" aria-hidden="true">{@html option.icon}</span>
            </label>
          {/each}
        </div>
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
          fileAccept=".txt"
        />
      </div>
    </section>

    <section class="settings-section settings-section--wide">
      <div class="section-heading">
        <h3 class="section-title">{translate($languageStore, "settings.resultsTitle")}</h3>
      </div>
      <div class="settings-row-list">
        <div class="settings-row" data-tutorial="settings-equivalent">
          <div class="settings-row__copy">
            <div class="settings-row__title">{translate($languageStore, "settings.equivalentTitle")}</div>
            <div class="settings-row__description">{translate($languageStore, "settings.equivalentDescription")}</div>
          </div>
          <button
            type="button"
            class="toggle-row toggle-row--inline"
            class:is-active={$settings.showEquivalentPricing}
            role="switch"
            aria-checked={$settings.showEquivalentPricing}
            aria-label={translate($languageStore, "settings.equivalentTitle")}
            on:click={() => handleEquivalentPricingChange(!$settings.showEquivalentPricing)}
          >
            <span class="toggle-switch">
              <span class="toggle-switch__thumb"></span>
            </span>
            <span class="toggle-state">{toggleSwitchLabel($settings.showEquivalentPricing)}</span>
          </button>
        </div>

        <div class="settings-row" data-tutorial="settings-bulk">
          <div class="settings-row__copy">
            <div class="settings-row__title">{translate($languageStore, "settings.bulkTitle")}</div>
            <div class="settings-row__description">{translate($languageStore, "settings.bulkDescription")}</div>
          </div>
          <button
            type="button"
            class="toggle-row toggle-row--inline"
            class:is-active={$settings.showBulkSellers}
            role="switch"
            aria-checked={$settings.showBulkSellers}
            aria-label={translate($languageStore, "settings.bulkTitle")}
            on:click={() => handleBulkSellersChange(!$settings.showBulkSellers)}
          >
            <span class="toggle-switch">
              <span class="toggle-switch__thumb"></span>
            </span>
            <span class="toggle-state">{toggleSwitchLabel($settings.showBulkSellers)}</span>
          </button>
        </div>

        <div class="settings-row" data-tutorial="settings-history">
          <div class="settings-row__copy">
            <div class="settings-row__title">{translate($languageStore, "settings.historyTitle")}</div>
            <div class="settings-row__description">{translate($languageStore, "settings.historyDescription")}</div>
          </div>
          <button
            type="button"
            class="toggle-row toggle-row--inline"
            class:is-active={$settings.showHistory}
            role="switch"
            aria-checked={$settings.showHistory}
            aria-label={translate($languageStore, "settings.historyTitle")}
            on:click={() => handleHistoryChange(!$settings.showHistory)}
          >
            <span class="toggle-switch">
              <span class="toggle-switch__thumb"></span>
            </span>
            <span class="toggle-state">{toggleSwitchLabel($settings.showHistory)}</span>
          </button>
        </div>

        <div class="settings-row" data-tutorial="settings-filters">
          <div class="settings-row__copy">
            <div class="settings-row__title">{translate($languageStore, "settings.finerFiltersTitle")}</div>
            <div class="settings-row__description">{translate($languageStore, "settings.finerFiltersDescription")}</div>
          </div>
          <button
            type="button"
            class="toggle-row toggle-row--inline"
            class:is-active={$settings.showFinerFilters}
            role="switch"
            aria-checked={$settings.showFinerFilters}
            aria-label={translate($languageStore, "settings.finerFiltersTitle")}
            on:click={() => handleFinerFiltersChange(!$settings.showFinerFilters)}
          >
            <span class="toggle-switch">
              <span class="toggle-switch__thumb"></span>
            </span>
            <span class="toggle-state">{toggleSwitchLabel($settings.showFinerFilters)}</span>
          </button>
        </div>
      </div>
    </section>

    <section class="settings-section settings-section--feature settings-section--wide" data-tutorial="settings-tutorial">
      <div class="section-heading">
        <h3 class="section-title">{translate($languageStore, "settings.onboardingTitle")}</h3>
      </div>
      <p class="section-description">{translate($languageStore, "settings.onboardingDescription")}</p>

      <div class="section-actions">
        <Button
          label={translate($languageStore, "settings.reopenTutorial")}
          theme="gold"
          class="side-btn"
          onClick={onOpenTutorial}
        />
      </div>
    </section>
  </div>
</div>

<style lang="scss">
  @use "sass:color";
  @use "../../lib/styles/variables" as *;

  .settings-page {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 5px;
    color: $white;
    animation: fade-in 0.3s ease;
  }

  .settings-grid {
    display: grid;
    gap: 14px;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .settings-section {
    background:
      linear-gradient(180deg, rgba($white, 0.03), rgba($white, 0.015)),
      rgba($white, 0.02);
    border: 1px solid rgba($white, 0.07);
    padding: 16px;
    border-radius: 8px;
    box-shadow: inset 0 1px 0 rgba($white, 0.02);
  }

  .settings-section--feature {
    background:
      linear-gradient(180deg, rgba($gold, 0.08), rgba($gold, 0.02)),
      rgba($white, 0.02);
    border-color: rgba($gold, 0.12);
  }

  .section-title {
    margin: 0;
    font-family: $primary-font;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $gold;
  }

  .section-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    min-width: 0;
  }

  .section-heading--inline {
    margin-bottom: 0;
  }

  .section-description {
    margin: 0;
    color: rgba($white, 0.72);
    font-size: 11px;
    line-height: 1.55;
  }

  .section-description--compact {
    margin-top: 8px;
  }

  .section-actions {
    margin-top: 14px;
  }

  .settings-inline-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .settings-row-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 0;
    border-top: 1px solid rgba($white, 0.07);
  }

  .settings-row:first-child {
    padding-top: 0;
    border-top: none;
  }

  .settings-row:last-child {
    padding-bottom: 0;
  }

  .settings-row__copy {
    min-width: 0;
  }

  .settings-row__title {
    color: rgba($white, 0.94);
    font-family: $primary-font;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .settings-row__description {
    margin-top: 4px;
    color: rgba($white, 0.66);
    font-size: 11px;
    line-height: 1.5;
  }

  .side-selector {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 14px;
  }

  .settings-actions-row {
    margin-top: 14px;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;

    &:focus-visible {
      .toggle-switch {
        box-shadow:
          0 0 0 1px rgba($gold, 0.28),
          0 0 0 3px rgba($gold, 0.12);
      }

      .toggle-state {
        color: $white;
      }
    }
  }

  .toggle-row--inline {
    width: auto;
    flex: 0 0 auto;
  }

  .toggle-switch {
    position: relative;
    width: 38px;
    height: 20px;
    border-radius: 999px;
    background: rgba($blue, 0.4);
    transition: background 0.16s ease, box-shadow 0.16s ease;
    flex: 0 0 auto;
  }

  .toggle-row:hover .toggle-switch {
    box-shadow: 0 0 0 1px rgba($blue, 0.2);
  }

  .toggle-row.is-active .toggle-switch {
    background: rgba($gold, 0.5);
  }

  .toggle-switch__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: rgba($blue-alt, 0.95);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
    transition: transform 0.16s ease, background 0.16s ease;
  }

  .toggle-state {
    min-width: 28px;
    color: rgba($white, 0.68);
    font-family: $primary-font;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-align: right;
    text-transform: uppercase;
  }

  .toggle-row.is-active .toggle-switch__thumb {
    transform: translateX(18px);
    background: #f7d08a;
  }

  :global(.side-btn) {
    flex: 1;
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
    border: 1px solid rgba($gold, 0.18);
    border-radius: 3px;
    background: rgba($white, 0.03);
    color: rgba($white, 0.82);
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;

    &:hover {
      background: rgba($gold, 0.07);
      border-color: rgba($gold, 0.34);
      color: $white;
    }
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
    justify-content: space-between;
    gap: 10px;
    padding: 0 34px 0 10px;
    cursor: pointer;
    background-color: rgba($white, 0.03);
    font-family: $primary-font;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    &:focus-visible {
      border-color: rgba($gold, 0.45);
      background: rgba($gold, 0.08);
      color: $gold;
      box-shadow: 0 0 0 1px rgba($gold, 0.14);
    }
  }

  .language-select-wrap::after {
    content: "▾";
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: rgba($gold, 0.72);
    font-size: 11px;
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
    border: 1px solid rgba($gold, 0.18);
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
    background: rgba($white, 0.02);
    color: rgba($white, 0.82);
    cursor: pointer;
    text-align: left;
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;

    &:hover,
    &.is-active {
      background: rgba($gold, 0.07);
      border-color: rgba($gold, 0.28);
      color: $white;
    }
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
    font-family: $primary-font;
    font-size: 11px;
    letter-spacing: 0.05em;
  }

  .language-option__native {
    font-weight: 600;
    text-transform: uppercase;
  }

  .language-option__translated {
    color: rgba($gold, 0.72);
    text-align: right;
  }

  .language-flag {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    object-fit: cover;
    border-radius: 999px;
    border: 1px solid rgba($white, 0.16);
    background: rgba($white, 0.04);
  }

  .language-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: $primary-font;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .info-tooltip {
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;

    &:hover .info-tooltip__content,
    &:focus-within .info-tooltip__content {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
  }

  .info-tooltip__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 1px solid rgba($gold, 0.28);
    border-radius: 999px;
    background: rgba($gold, 0.08);
    color: rgba($gold, 0.9);
    font-family: $primary-font;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    cursor: help;

    &:focus-visible {
      box-shadow:
        0 0 0 1px rgba($gold, 0.28),
        0 0 0 3px rgba($gold, 0.12);
    }
  }

  .info-tooltip__content {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 8;
    width: min(260px, calc(100vw - 64px));
    padding: 10px 12px;
    border: 1px solid rgba($gold, 0.18);
    border-radius: 4px;
    background: #14110d;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.32);
    color: rgba($white, 0.82);
    font-size: 11px;
    line-height: 1.5;
    text-transform: none;
    letter-spacing: normal;
    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
    transition: opacity 0.16s ease, transform 0.16s ease;
  }

  .compact-options {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba($white, 0.08);
  }

  .compact-options__heading {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .compact-options__title {
    font-family: $primary-font;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: rgba($gold, 0.9);
  }

  .compact-options__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .compact-option {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid rgba($white, 0.08);
    border-radius: 4px;
    background: rgba($black, 0.26);
    cursor: pointer;
    transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;

    input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }

    &:hover {
      border-color: rgba($gold, 0.34);
      background: rgba($gold, 0.08);
      transform: translateY(-1px);
    }

    &:focus-within {
      border-color: rgba($gold, 0.5);
      box-shadow:
        0 0 0 1px rgba($gold, 0.2),
        0 0 0 3px rgba($gold, 0.1);
    }

    &.is-selected {
      border-color: rgba($gold, 0.38);
      background: rgba(54, 42, 28, 0.96);
      color: #e2b56e;
    }
  }

  .compact-option__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 15px;
    color: rgba($white, 0.84);
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

  @media (max-width: 430px) {
    .settings-grid {
      gap: 12px;
    }

    .settings-row {
      flex-direction: column;
      align-items: stretch;
    }

    .settings-inline-row {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .toggle-row--inline {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .settings-page,
    .toggle-switch,
    .toggle-switch__thumb,
    .language-select,
    .language-menu__item,
    .info-tooltip__content,
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
      grid-column: 1 / -1;
    }
  }
</style>
