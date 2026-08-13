<script lang="ts">
  import Button from "./Button.svelte"
  import {
    languageStore,
    translate,
    type AppLanguage
  } from "../lib/services/i18n"

  let {
    open = false,
    selectedLanguage = "en",
    onSelectLanguage = () => {},
    onConfirm = () => {}
  }: {
    open?: boolean;
    selectedLanguage?: AppLanguage;
    onSelectLanguage?: (language: AppLanguage) => void;
    onConfirm?: () => void;
  } = $props()

  const languages: Array<{ code: AppLanguage; label: string }> = [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "pt", label: "Português" },
    { code: "ru", label: "Русский" },
    { code: "sv", label: "Svenska" },
    { code: "th", label: "ไทย" },
    { code: "de", label: "Deutsch" },
    { code: "fr", label: "Français" },
    { code: "ja", label: "日本語" },
    { code: "ko", label: "한국어" },
    { code: "zh-tw", label: "繁體中文" },
    { code: "zh-cn", label: "简体中文" }
  ]
</script>

{#if open}
  <div class="welcome-dialog-backdrop" role="presentation">
    <div
      class="welcome-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-dialog-title">
      <div class="welcome-dialog__header">
        <h3 id="welcome-dialog-title">
          {translate($languageStore, "welcome.title")}
        </h3>
      </div>

      <div class="welcome-dialog__body">
        <p>{translate($languageStore, "welcome.message")}</p>

        <div class="welcome-dialog__label">
          {translate($languageStore, "welcome.languageLabel")}
        </div>

        <div class="welcome-language-grid">
          {#each languages as language (language.code)}
            <button
              type="button"
              class="welcome-language-button"
              class:is-selected={selectedLanguage === language.code}
              onclick={() => onSelectLanguage(language.code)}>
              {language.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="welcome-dialog__actions">
        <Button
          label={translate($languageStore, "welcome.continue")}
          theme="gold"
          onClick={onConfirm} />
      </div>
    </div>
  </div>
{/if}

<style>
.welcome-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(5, 5, 5, 0.72);
  backdrop-filter: blur(6px);
}

.welcome-dialog {
  width: min(100%, 420px);
  border: 1px solid rgba(163, 141, 109, 0.22);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.05), rgba(163, 141, 109, 0.015)), rgba(5, 5, 5, 0.98);
  box-shadow: inset 0 1px 0 rgba(238, 238, 238, 0.02), 0 18px 38px rgba(5, 5, 5, 0.55);
  overflow: hidden;
}

.welcome-dialog__header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(163, 141, 109, 0.1);
}
.welcome-dialog__header h3 {
  margin: 0;
  font-family: "FontinSmallcaps", serif;
  font-size: calc(15px * var(--bt-text-scale, 1));
  letter-spacing: 0.04em;
  color: #a38d6d;
}

.welcome-dialog__body {
  padding: 14px 16px 16px;
}
.welcome-dialog__body p {
  margin: 0 0 14px;
  color: rgba(238, 238, 238, 0.82);
  font-size: calc(12px * var(--bt-text-scale, 1));
  line-height: 1.5;
}

.welcome-dialog__label {
  margin-bottom: 10px;
  color: rgba(196, 177, 140, 0.88);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(10px * var(--bt-text-scale, 1));
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.welcome-language-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.welcome-language-button {
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid rgba(238, 238, 238, 0.1);
  border-radius: 4px;
  background: rgba(238, 238, 238, 0.03);
  color: rgba(238, 238, 238, 0.84);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(11px * var(--bt-text-scale, 1));
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}
.welcome-language-button:hover {
  border-color: rgba(163, 141, 109, 0.34);
  background: rgba(163, 141, 109, 0.08);
  color: #eeeeee;
}
.welcome-language-button:focus-visible {
  border-color: rgba(163, 141, 109, 0.5);
  box-shadow: 0 0 0 1px rgba(163, 141, 109, 0.22), 0 0 0 3px rgba(163, 141, 109, 0.1);
}
.welcome-language-button.is-selected {
  border-color: rgba(163, 141, 109, 0.42);
  background: rgba(163, 141, 109, 0.12);
  color: #a38d6d;
  box-shadow: 0 0 0 1px rgba(163, 141, 109, 0.14);
}

.welcome-dialog__actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 16px 16px;
}

@media (prefers-reduced-motion: reduce) {
  .welcome-language-button {
    transition: none !important;
  }
}
</style>
