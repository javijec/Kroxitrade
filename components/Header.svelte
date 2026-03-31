<script lang="ts">
  import { languageStore, translate } from "../lib/services/i18n";
  export let logoUrl: string;
  export let isMinimized: boolean = false;
  export let onToggleMinimize: () => void = () => {};
  export let sidebarSide: 'left' | 'right' = 'left';
</script>

<header class="header">
  <div class="brand">
    <img class="logo" src={logoUrl} alt="Poe Trade Plus" />
    <div class="brand-copy">
      <h1>Poe Trade Plus</h1>
      <div class="subtitle">{translate($languageStore, "header.subtitle")}</div>
    </div>
  </div>
  
  <div class="toolbar">
    <button class="minimize-toggle" on:click={onToggleMinimize} title={isMinimized ? translate($languageStore, "header.expandSidebar") : translate($languageStore, "header.minimizeSidebar")}>
      <span class="chev-icon">
        {#if sidebarSide === 'left'}
          {isMinimized ? "▶" : "◀"}
        {:else}
          {isMinimized ? "◀" : "▶"}
        {/if}
      </span>
    </button>
  </div>
</header>

<style lang="scss">
  @use "sass:color";
  @use "../lib/styles/variables" as *;

  .header {
    padding: 14px 14px 12px;
    background-color: color.adjust($black, $lightness: 3%);
    border-bottom: 1px solid rgba($gold, 0.18);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;

    h1 {
      margin: 0;
      font-family: $primary-font;
      font-size: 18px;
      line-height: 1;
      letter-spacing: 0.9px;
      color: $gold;
    }

    .subtitle {
        margin-top: 3px;
        font-size: 11px;
        color: rgba($white, 0.58);
    }
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .brand-copy {
    min-width: 0;
  }

  .logo {
    height: 64px;
    width: auto;
    flex: 0 0 auto;
  }

  .toolbar {
    display: flex;
    gap: 6px;
    margin-left: auto;
    align-items: center;
  }

  .minimize-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: rgba($white, 0.04);
    border: 1px solid rgba($white, 0.08);
    border-radius: 4px;
    color: rgba($white, 0.72);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);

    .chev-icon {
      font-size: 10px;
      line-height: 1;
    }

    &:hover {
      background: rgba($white, 0.1);
      border-color: rgba($gold, 0.4);
      color: $gold;
    }
  }
</style>
