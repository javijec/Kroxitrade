<script lang="ts">
  import { storageService } from "../lib/services/storage";
  import { onMount } from "svelte";

  export let logoUrl: string;
  
  const COLLAPSED_STORAGE_KEY = "is-collapsed";
  let isCollapsed = false;

  onMount(async () => {
    isCollapsed = !!(await storageService.getValue(COLLAPSED_STORAGE_KEY));
    if (isCollapsed) {
        document.dispatchEvent(new CustomEvent('bt-collapse-toggle', { detail: true }));
    }
  });

  const toggleCollapse = async () => {
    isCollapsed = !isCollapsed;
    await storageService.setValue(COLLAPSED_STORAGE_KEY, isCollapsed ? "true" : null);
    document.dispatchEvent(new CustomEvent('bt-collapse-toggle', { detail: isCollapsed }));
  };
</script>

<header class="header">
  <div class="brand">
    <img class="logo" src={logoUrl} alt="Kroxitrade" />
    <div class="brand-copy">
      <h1>Kroxitrade</h1>
      <div class="subtitle">Trade Companion</div>
    </div>
  </div>
  
  <div class="toolbar">
    <button class="tool-btn info-btn" type="button" aria-label="About Kroxitrade" on:click={() => { /* Info logic */ }}>i</button>
    <button class="tool-btn collapse-btn" on:click={toggleCollapse} type="button" aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
        {isCollapsed ? ">" : "<"}
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
    height: 22px;
    width: auto;
    flex: 0 0 auto;
  }

  .toolbar {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }

  .tool-btn {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: rgba($white, 0.04);
    border: 1px solid rgba($white, 0.08);
    color: rgba($white, 0.72);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;

    &:hover {
      color: $white;
      background-color: rgba($white, 0.08);
      border-color: rgba($gold, 0.22);
    }
  }

  .collapse-btn {
    font-weight: 700;
  }

  .info-btn {
    font-family: Georgia, serif;
    font-style: italic;
  }
</style>
