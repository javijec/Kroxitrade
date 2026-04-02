<script lang="ts">
  import { languageStore, translate, type AppLanguage } from "../../lib/services/i18n";
  import { settings, type SidebarSide } from "../../lib/services/settings";
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

  const DEFAULT_SIDEBAR_WIDTH = 450;
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

  async function handleSidebarWidthReset() {
    await settings.updateSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  }

  async function handleLanguageChange(language: AppLanguage) {
    await settings.updateLanguage(language);
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
  <section class="settings-section">
    <h3 class="section-title">{translate($languageStore, "settings.sidebarTitle")}</h3>
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

  <section class="settings-section">
    <h3 class="section-title">{translate($languageStore, "settings.languageTitle")}</h3>
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

  <section class="settings-section">
    <h3 class="section-title">{translate($languageStore, "settings.equivalentTitle")}</h3>
    <p class="section-description">{translate($languageStore, "settings.equivalentDescription")}</p>

    <div class="side-selector">
      <Button
        label={translate($languageStore, "settings.hidden")}
        theme={$settings.showEquivalentPricing ? 'blue' : 'gold'}
        class="side-btn"
        onClick={() => handleEquivalentPricingChange(false)}
      />
      <Button
        label={translate($languageStore, "settings.visible")}
        theme={$settings.showEquivalentPricing ? 'gold' : 'blue'}
        class="side-btn"
        onClick={() => handleEquivalentPricingChange(true)}
      />
    </div>
  </section>

  <section class="settings-section">
    <h3 class="section-title">{translate($languageStore, "settings.bulkTitle")}</h3>
    <p class="section-description">{translate($languageStore, "settings.bulkDescription")}</p>

    <div class="side-selector">
      <Button
        label={translate($languageStore, "settings.hidden")}
        theme={$settings.showBulkSellers ? 'blue' : 'gold'}
        class="side-btn"
        onClick={() => handleBulkSellersChange(false)}
      />
      <Button
        label={translate($languageStore, "settings.visible")}
        theme={$settings.showBulkSellers ? 'gold' : 'blue'}
        class="side-btn"
        onClick={() => handleBulkSellersChange(true)}
      />
    </div>
  </section>

</div>

<style lang="scss">
  @use "sass:color";
  @use "../../lib/styles/variables" as *;

  .settings-page {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 5px;
    color: $white;
    animation: fade-in 0.3s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .settings-section {
    background: rgba($white, 0.02);
    border: 1px solid rgba($white, 0.06);
    padding: 16px;
    border-radius: 4px;

    &.info {
      background: rgba($blue, 0.05);
      border-color: rgba($blue, 0.2);
    }
  }

  .section-title {
    margin: 0 0 8px;
    font-family: $primary-font;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $gold;
  }

  .section-description {
    margin: 0 0 16px;
    font-size: 12px;
    color: rgba($white, 0.6);
    line-height: 1.5;
  }

  .side-selector {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
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
    outline: none;

    &:focus {
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
</style>
