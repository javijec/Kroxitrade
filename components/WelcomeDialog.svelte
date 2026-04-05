<script lang="ts">
  import Button from "./Button.svelte"
  import {
    languageStore,
    translate,
    type AppLanguage
  } from "../lib/services/i18n"

  export let open = false
  export let selectedLanguage: AppLanguage = "en"
  export let onSelectLanguage: (language: AppLanguage) => void = () => {}
  export let onConfirm: () => void = () => {}

  const languages: Array<{ code: AppLanguage; label: string }> = [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "pt", label: "Português" },
    { code: "ru", label: "Русский" },
    { code: "th", label: "ไทย" },
    { code: "de", label: "Deutsch" },
    { code: "fr", label: "Français" },
    { code: "ja", label: "日本語" },
    { code: "ko", label: "한국어" }
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
              on:click={() => onSelectLanguage(language.code)}>
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

<style lang="scss">
  @use "../lib/styles/variables" as *;

  .welcome-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba($black, 0.72);
    backdrop-filter: blur(6px);
  }

  .welcome-dialog {
    width: min(100%, 420px);
    border: 1px solid rgba($gold, 0.22);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba($gold, 0.05), rgba($gold, 0.015)),
      rgba($poe-black, 0.98);
    box-shadow:
      inset 0 1px 0 rgba($white, 0.02),
      0 18px 38px rgba($black, 0.55);
    overflow: hidden;
  }

  .welcome-dialog__header {
    padding: 14px 16px 10px;
    border-bottom: 1px solid rgba($gold, 0.1);

    h3 {
      margin: 0;
      font-family: $primary-font;
      font-size: 15px;
      letter-spacing: 0.04em;
      color: $gold;
    }
  }

  .welcome-dialog__body {
    padding: 14px 16px 16px;

    p {
      margin: 0 0 14px;
      color: rgba($white, 0.82);
      font-size: 12px;
      line-height: 1.5;
    }
  }

  .welcome-dialog__label {
    margin-bottom: 10px;
    color: rgba($gold-alt, 0.88);
    font-family: $primary-font;
    font-size: 10px;
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
    border: 1px solid rgba($white, 0.1);
    border-radius: 4px;
    background: rgba($white, 0.03);
    color: rgba($white, 0.84);
    font-family: $primary-font;
    font-size: 11px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: all 0.16s ease;

    &:hover {
      border-color: rgba($gold, 0.34);
      background: rgba($gold, 0.08);
      color: $white;
    }

    &.is-selected {
      border-color: rgba($gold, 0.42);
      background: rgba($gold, 0.12);
      color: $gold;
      box-shadow: 0 0 0 1px rgba($gold, 0.14);
    }
  }

  .welcome-dialog__actions {
    display: flex;
    justify-content: flex-end;
    padding: 0 16px 16px;
  }
</style>
