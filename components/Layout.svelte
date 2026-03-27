<script lang="ts">
  import Header from "./Header.svelte";
  import Bookmarks from "./pages/Bookmarks.svelte";
  import History from "./pages/History.svelte";
  import About from "./pages/About.svelte";
  import FinerFilters from "./FinerFilters.svelte";
  import logoUrl from "data-base64:~assets/logo.png";
  import { flashMessages } from "../lib/services/flash";
  
  let currentPage: 'bookmarks' | 'history' | 'about' = 'bookmarks';
  let isMinimized = false;

  const toggleMinimize = () => {
    isMinimized = !isMinimized;
  };

  $: {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isMinimized) {
        root.style.setProperty('--bt-sidebar-width', '40px');
      } else {
        root.style.setProperty('--bt-sidebar-width', '360px');
      }
    }
  }
</script>

<div
  id="kroxitrade-container" class:is-minimized={isMinimized}>
  <Header {logoUrl} {isMinimized} onToggleMinimize={toggleMinimize} />
  
  <nav class="main-nav">
    <button 
        class="nav-item {currentPage === 'bookmarks' ? 'is-active' : ''}" 
        on:click={() => currentPage = 'bookmarks'}
    >
        Bookmarks
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

    {:else if currentPage === 'history'}
        <History />
    {:else if currentPage === 'about'}
        <About />
    {/if}
  </main>

  <FinerFilters />
</div>

{#if isMinimized}
  <button class="floating-restore-btn" on:click={toggleMinimize} aria-label="Restore Kroxitrade Panel">
    <img src={logoUrl} alt="Logo" class="floater-logo" />
    <span class="chev-icon">▶</span>
  </button>
{/if}

<style lang="scss">
  @use "sass:color";
  @use "../lib/styles/variables" as *;

  #kroxitrade-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 360px !important;
    min-width: 360px !important;
    max-width: 360px !important;
    height: 100vh;
    min-height: 100vh;
    max-height: 100vh;
    overflow: hidden;
    background-color: $poe-black;
    display: flex;
    flex-direction: column;
    font-family: $default-font;
    color: $white;
    transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    pointer-events: auto;
    
    &.is-minimized {
      transform: translateX(-100%);
    }
  }

  .floating-restore-btn {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    background: rgba($black, 0.6);
    backdrop-filter: blur(4px);
    border: 1px solid rgba($gold, 0.3);
    border-left: none;
    padding: 10px 8px 10px 6px;
    border-radius: 0 8px 8px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 2px 0 10px rgba($black, 0.5);
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    z-index: 2147483647;
    pointer-events: auto;

    &:hover {
      background: rgba($black, 0.8);
      border-color: $gold;
      box-shadow: 4px 0 15px rgba($gold, 0.15);
      padding-left: 8px; /* slight peek effect */
    }

    .floater-logo {
      width: 22px;
      height: auto;
      pointer-events: none;
      filter: drop-shadow(0 0 2px rgba($black, 0.8));
    }

    .chev-icon {
      color: $gold;
      font-size: 11px;
    }
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

  .flash-messages {
    position: absolute;
    top: 65px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }

  .flash {
    pointer-events: auto;
    padding: 10px;
    margin: 0;
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
