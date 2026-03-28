<script lang="ts">
  import { languageStore, translate, type AppLanguage } from "../../lib/services/i18n";
  import { settings, type SidebarSide } from "../../lib/services/settings";
  import Button from "../Button.svelte";
  import { onMount } from "svelte";
  import flagBR from "data-base64:../../assets/BR.png";
  import flagDE from "data-base64:../../assets/DE.png";
  import flagES from "data-base64:../../assets/ES.png";
  import flagFR from "data-base64:../../assets/FR.png";
  import flagGB from "data-base64:../../assets/GB.png";
  import flagJP from "data-base64:../../assets/JP.png";
  import flagKR from "data-base64:../../assets/KR.png";
  import flagRU from "data-base64:../../assets/RU.png";
  import flagTH from "data-base64:../../assets/TH.png";

  const DEFAULT_SIDEBAR_WIDTH = 360;
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

  async function handleSideChange(side: SidebarSide) {
    await settings.updateSide(side);
  }

  async function handleEquivalentPricingChange(showEquivalentPricing: boolean) {
    await settings.updateEquivalentPricingVisibility(showEquivalentPricing);
  }

  async function handleSidebarWidthReset() {
    await settings.updateSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  }

  async function handleLanguageChange(language: AppLanguage) {
    await settings.updateLanguage(language);
  }

  function handleLanguageSelectChange(event: Event) {
    const nextLanguage = (event.currentTarget as HTMLSelectElement).value as AppLanguage;
    void handleLanguageChange(nextLanguage);
  }

  onMount(async () => {
    await settings.load();
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

    <div class="language-selector">
      <div class="language-preview">
        <img class="language-flag" src={selectedLanguage.flag} alt={selectedLanguage.label} />
      </div>

      <div class="language-select-wrap">
        <select
          class="language-select"
          value={$settings.language}
          on:change={handleLanguageSelectChange}
        >
          {#each languages as language (language.code)}
            <option value={language.code}>{language.label}</option>
          {/each}
        </select>
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
    border: 1px solid rgba($blue, 0.28);
    border-radius: 3px;
    background: rgba($blue, 0.08);
    color: color.adjust($blue, $lightness: 20%);
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;

    &:hover {
      background: rgba($blue, 0.16);
      border-color: rgba($blue, 0.55);
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
    appearance: none;
    min-width: 0;
    padding: 0 34px 0 10px;
    cursor: pointer;
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
    }
  }

  .language-select-wrap::after {
    content: "▾";
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: rgba($white, 0.55);
    font-size: 11px;
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
