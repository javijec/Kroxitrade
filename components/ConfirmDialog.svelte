<script lang="ts">
  import { languageStore, translate } from "../lib/services/i18n"
  import Button from "./Button.svelte"

  export let open = false
  export let title = ""
  export let message = ""
  export let confirmLabel = translate($languageStore, "confirm.delete")
  export let cancelLabel = translate($languageStore, "confirm.cancel")
  export let onConfirm: () => void = () => {}
  export let onCancel: () => void = () => {}

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      onCancel()
    }
  }
</script>

{#if open}
  <div
    class="confirm-dialog-backdrop"
    role="presentation"
    on:click={handleBackdropClick}
    on:keydown={(event) => {
      if (event.key === "Escape") {
        onCancel()
      }
    }}>
    <div
      class="confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title">
      <div class="confirm-dialog__header">
        <h3 id="confirm-dialog-title">{title}</h3>
      </div>

      <div class="confirm-dialog__body">
        <p>{message}</p>
      </div>

      <div class="confirm-dialog__actions">
        <Button label={cancelLabel} theme="blue" onClick={onCancel} />
        <Button label={confirmLabel} theme="red" onClick={onConfirm} />
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  @use "../lib/styles/variables" as *;

  .confirm-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba($black, 0.72);
    backdrop-filter: blur(6px);
    overscroll-behavior: contain;
  }

  .confirm-dialog {
    width: min(100%, 360px);
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

  .confirm-dialog__header {
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

  .confirm-dialog__body {
    padding: 14px 16px 16px;

    p {
      margin: 0;
      color: rgba($white, 0.82);
      font-size: 12px;
      line-height: 1.5;
    }
  }

  .confirm-dialog__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 16px 16px;
  }
</style>
