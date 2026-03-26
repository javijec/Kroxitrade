<script lang="ts">
  import Header from "./Header.svelte";
  import Bookmarks from "./pages/Bookmarks.svelte";
  import History from "./pages/History.svelte";
  import PinnedItems from "./pages/PinnedItems.svelte";
  import About from "./pages/About.svelte";
  import logoUrl from "data-base64:~assets/logo.png";
  import { flashMessages } from "../lib/services/flash";
  import { itemResultsService } from "../lib/services/item-results";
  import { onMount } from "svelte";

  const PANEL_WIDTH = "360px";
  let currentPage: 'bookmarks' | 'history' | 'pinned' | 'about' = 'bookmarks';
  let isCollapsed = false;

  onMount(() => {
    const handleToggle = (e: any) => {
        isCollapsed = e.detail;
    };
    document.addEventListener('bt-collapse-toggle', handleToggle);
    return () => document.removeEventListener('bt-collapse-toggle', handleToggle);
  });
</script>

<div
  id="better-trading-container"
  class={isCollapsed ? 'is-collapsed' : ''}
  style={`width:${PANEL_WIDTH};min-width:${PANEL_WIDTH};max-width:${PANEL_WIDTH};`}>
  <Header {logoUrl} />
  
  <nav class="main-nav">
    <button 
        class="nav-item {currentPage === 'bookmarks' ? 'is-active' : ''}" 
        on:click={() => currentPage = 'bookmarks'}
    >
        Bookmarks
    </button>
    <button 
        class="nav-item {currentPage === 'pinned' ? 'is-active' : ''}" 
        on:click={() => currentPage = 'pinned'}
    >
        Pinned
    </button>
    <button 
        class="nav-item {currentPage === 'history' ? 'is-active' : ''}" 
        on:click={() => currentPage = 'history'}
    >
        History
    </button>
    <button 
        class="nav-item {currentPage === 'about' ? 'is-active' : ''}" 
        on:click={() => currentPage = 'about'}
    >
        About
    </button>
  </nav>

  <div class="flash-messages">
    {#each $flashMessages as flash (flash.id)}
      <div class="flash flash-{flash.type}" on:click={() => flashMessages.remove(flash.id)}>
        {flash.message}
      </div>
    {/each}
  </div>

  <main>
    {#if currentPage === 'bookmarks'}
        <Bookmarks />
    {:else if currentPage === 'pinned'}
        <PinnedItems />
    {:else if currentPage === 'history'}
        <History />
    {:else if currentPage === 'about'}
        <About />
    {/if}
  </main>
</div>

<style lang="scss">
  @use "sass:color";
  @use "../lib/styles/variables" as *;

  #better-trading-container {
      /* Base styles already in base.scss for the container ID */
  }

  .main-nav {
    display: flex;
    width: 100%;
    min-width: 0;
    background-color: rgba($white, 0.02);
    border-bottom: 1px solid rgba($white, 0.08);
    padding: 0 8px;
    box-sizing: border-box;
  }

  .nav-item {
    flex: 1;
    padding: 11px 4px 10px;
    background: transparent;
    border: 0;
    color: rgba($white, 0.56);
    font-family: $primary-font;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 1px solid transparent;

    &:hover { color: $white; }
    &.is-active { 
        color: $white; 
        border-bottom-color: $gold;
        background-color: rgba($white, 0.04);
    }
  }

  .flash {
    padding: 10px;
    margin: 5px;
    color: $white;
    font-size: 13px;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0,0,0,0.5);

    &-success { background-color: $green; border: 1px solid color.adjust($green, $lightness: 10%); }
    &-alert { background-color: $red; border: 1px solid color.adjust($red, $lightness: 10%); }
    &-info { background-color: $blue; border: 1px solid color.adjust($blue, $lightness: 10%); }
  }

  main {
    flex: 1;
    min-height: 0;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 12px 10px 10px;
    background-color: $poe-black;
    box-sizing: border-box;
  }

  main > :global(*) {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }
</style>
