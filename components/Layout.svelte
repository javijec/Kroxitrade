<script lang="ts">
  import bookmarkIcon from "data-text:lucide-static/icons/bookmark.svg";
  import clockIcon from "data-text:lucide-static/icons/history.svg";
  import infoIcon from "data-text:lucide-static/icons/info.svg";
  import layersIcon from "data-text:lucide-static/icons/layers-3.svg";
  import settingsIcon from "data-text:lucide-static/icons/settings-2.svg";
  import Header from "./Header.svelte";
  import Bookmarks from "./pages/Bookmarks.svelte";
  import BulkSellers from "./pages/BulkSellers.svelte";
  import History from "./pages/History.svelte";
  import Settings from "./pages/Settings.svelte";
  import About from "./pages/About.svelte";
  import FinerFilters from "./FinerFilters.svelte";
  import logoUrl from "data-base64:~assets/logo.webp";
  import { flashMessages } from "../lib/services/flash";
  import { languageStore, translate } from "../lib/services/i18n";
  import { settings } from "../lib/services/settings";
  import { storageService } from "../lib/services/storage";
  import { tradeLocationService } from "../lib/services/trade-location";
  import { onDestroy, onMount } from "svelte";
  
  const MINIMIZED_STORAGE_KEY = "layout-minimized";

  let currentPage: 'bookmarks' | 'bulk' | 'history' | 'about' | 'settings' = 'bookmarks';
  let isMinimized = false;
  let isResizing = false;
  let liveSidebarWidth: number | null = null;
  let loadedMinimizedStateKey: string | null = null;

  const MIN_SIDEBAR_WIDTH = 300;
  const MAX_SIDEBAR_WIDTH = 560;
  const MINIMIZED_WIDTH = 0;

  const clampSidebarWidth = (value: number) =>
    Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, Math.round(value)));

  const getExpandedSidebarWidth = () => clampSidebarWidth($settings.sidebarWidth || 450);
  const getRenderedSidebarWidth = () => clampSidebarWidth(liveSidebarWidth ?? getExpandedSidebarWidth());
  const normalizeNavIcon = (svg: string) =>
    svg
      .replace(/<svg\b([^>]*)>/, (_match, attrs) => {
        const cleaned = attrs
          .replace(/\s(width|height|stroke-width|class|aria-hidden)="[^"]*"/g, "")
          .trim();
        const nextAttrs = cleaned ? `${cleaned} ` : "";
        return `<svg ${nextAttrs} viewBox="-2 -2 28 28" class="nav-svg" aria-hidden="true">`;
      })
      .replace(/stroke-width="[^"]*"/g, 'stroke-width="1.75"');

  const navIcons = {
    bookmarks: normalizeNavIcon(bookmarkIcon),
    bulk: normalizeNavIcon(layersIcon),
    history: normalizeNavIcon(clockIcon),
    settings: normalizeNavIcon(settingsIcon),
    about: normalizeNavIcon(infoIcon)
  };

  const toggleMinimize = () => {
    isMinimized = !isMinimized;
  };

  const loadMinimizedState = (storageKey: string) => {
    isMinimized = storageService.getLocalValue(storageKey) === "true";
    loadedMinimizedStateKey = storageKey;
  };

  const persistMinimizedState = (storageKey: string, minimized: boolean) => {
    storageService.setLocalValue(storageKey, minimized ? "true" : "false");
  };

  const updateSidebarWidthCssVar = () => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty(
      '--bt-sidebar-width',
      isMinimized ? `${MINIMIZED_WIDTH}px` : `${getRenderedSidebarWidth()}px`
    );
  };

  const stopResize = async () => {
    if (!isResizing) return;

    isResizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    if (liveSidebarWidth !== null) {
      await settings.updateSidebarWidth(clampSidebarWidth(liveSidebarWidth));
      liveSidebarWidth = null;
    }
  };

  const handleResizeMove = (event: MouseEvent) => {
    if (!isResizing || isMinimized) return;

    const nextWidth = $settings.sidebarSide === 'right'
      ? window.innerWidth - event.clientX
      : event.clientX;

    const clampedWidth = clampSidebarWidth(nextWidth);
    liveSidebarWidth = clampedWidth;
    document.documentElement.style.setProperty('--bt-sidebar-width', `${clampedWidth}px`);
  };

  const startResize = (event: MouseEvent) => {
    if (isMinimized) return;

    event.preventDefault();
    isResizing = true;
    liveSidebarWidth = getExpandedSidebarWidth();
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  onMount(async () => {
    await settings.load();
    tradeLocationService.startPolling();

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', stopResize);
    window.addEventListener('mouseleave', stopResize);
  });

  onDestroy(() => {
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', stopResize);
    window.removeEventListener('mouseleave', stopResize);
  });

  $: if (!$settings.showBulkSellers && currentPage === 'bulk') {
    currentPage = 'bookmarks';
  }

  $: if (!$settings.showHistory && currentPage === 'history') {
    currentPage = 'bookmarks';
  }

  $: currentLocation = tradeLocationService.locationStore;
  $: minimizedStorageKey = `${MINIMIZED_STORAGE_KEY}-${$currentLocation.version}`;
  $: if (minimizedStorageKey && loadedMinimizedStateKey !== minimizedStorageKey) {
    loadMinimizedState(minimizedStorageKey);
  }
  $: if (loadedMinimizedStateKey === minimizedStorageKey) {
    persistMinimizedState(minimizedStorageKey, isMinimized);
  }

  $: {
    if (typeof document !== 'undefined') {
      const isRight = $settings.sidebarSide === 'right';
      
      updateSidebarWidthCssVar();

      // Add classes to body and root to help site adjustments
      document.body.classList.toggle('is-side-right', isRight);
      document.body.classList.toggle('is-side-left', !isRight);
      document.documentElement.classList.toggle('bt-side-right', isRight);
      document.body.classList.toggle('bt-sidebar-minimized', isMinimized);
      document.documentElement.classList.toggle('bt-sidebar-minimized', isMinimized);
      document.body.classList.toggle('bt-is-resizing-sidebar', isResizing);

      // Target all possible plasmo host containers and apply direct styles for extra robustness
      const hosts = document.querySelectorAll('plasmo-csui, #plasmo-shadow-container');
      hosts.forEach((h: any) => {
        h.classList.toggle('is-side-right', isRight);
        h.classList.toggle('is-side-left', !isRight);
        
        if (isRight) {
          h.style.setProperty('left', 'auto', 'important');
          h.style.setProperty('right', '0', 'important');
        } else {
          h.style.setProperty('left', '0', 'important');
          h.style.setProperty('right', 'auto', 'important');
        }
      });
    }
  }
</script>

<div
  id="kroxitrade-container" 
  class:is-minimized={isMinimized} 
  class:side-right={$settings.sidebarSide === 'right'}
>
  {#if !isMinimized}
    <button
      type="button"
      class="resize-handle"
      class:side-right={$settings.sidebarSide === 'right'}
      aria-label={translate($languageStore, "layout.resizeSidebar")}
      on:mousedown={startResize}
    ></button>
  {/if}

  <Header {logoUrl} {isMinimized} onToggleMinimize={toggleMinimize} sidebarSide={$settings.sidebarSide} />
  
  <nav class="main-nav">
    <button 
        class="nav-item {currentPage === 'bookmarks' ? 'is-active' : ''}" 
        on:click={() => currentPage = 'bookmarks'}
    >
        <span class="nav-item__icon" aria-hidden="true">{@html navIcons.bookmarks}</span>
        <span class="nav-item__label">{translate($languageStore, "layout.nav.bookmarks")}</span>
    </button>

    {#if $settings.showBulkSellers}
      <button 
          class="nav-item {currentPage === 'bulk' ? 'is-active' : ''}" 
          on:click={() => currentPage = 'bulk'}
      >
          <span class="nav-item__icon" aria-hidden="true">{@html navIcons.bulk}</span>
          <span class="nav-item__label">{translate($languageStore, "layout.nav.bulk")}</span>
      </button>
    {/if}

    {#if $settings.showHistory}
      <button 
          class="nav-item {currentPage === 'history' ? 'is-active' : ''}" 
          on:click={() => currentPage = 'history'}
      >
          <span class="nav-item__icon" aria-hidden="true">{@html navIcons.history}</span>
          <span class="nav-item__label">{translate($languageStore, "layout.nav.history")}</span>
      </button>
    {/if}
    <button 
        class="nav-item {currentPage === 'settings' ? 'is-active' : ''}" 
        on:click={() => currentPage = 'settings'}
    >
        <span class="nav-item__icon" aria-hidden="true">{@html navIcons.settings}</span>
        <span class="nav-item__label">{translate($languageStore, "layout.nav.settings")}</span>
    </button>
    <button 
        class="nav-item nav-item--icon-only {currentPage === 'about' ? 'is-active' : ''}" 
        title={translate($languageStore, "layout.nav.about")}
        aria-label={translate($languageStore, "layout.nav.about")}
        on:click={() => currentPage = 'about'}
    >
        <span class="nav-item__icon" aria-hidden="true">{@html navIcons.about}</span>
    </button>
  </nav>

  <div class="flash-messages">
    {#each $flashMessages as flash (flash.id)}
      <button 
        class="flash flash-{flash.type}" 
        on:click={() => flashMessages.remove(flash.id)}
        aria-label={translate($languageStore, "layout.removeAlert")}
      >
        {flash.message}
      </button>
    {/each}
  </div>

  <main>
    {#if currentPage === 'bookmarks'}
        <Bookmarks />
    {:else if currentPage === 'bulk' && $settings.showBulkSellers}
        <BulkSellers />
    {:else if currentPage === 'history' && $settings.showHistory}
        <History />
    {:else if currentPage === 'settings'}
        <Settings />
    {:else if currentPage === 'about'}
        <About />
    {/if}
  </main>

  <FinerFilters />
</div>

{#if isMinimized}
  <button 
    class="floating-restore-btn" 
    class:side-right={$settings.sidebarSide === 'right'}
    on:click={toggleMinimize} 
    aria-label={translate($languageStore, "layout.restorePanel")}
  >
    <img src={logoUrl} alt="Logo" class="floater-logo" />
    <span class="chev-icon">{$settings.sidebarSide === 'right' ? "◀" : "▶"}</span>
  </button>
{/if}

<style lang="scss">
  @use "sass:color";
  @use "../lib/styles/variables" as *;

  #kroxitrade-container {
    position: absolute;
    left: 0;
    top: 0;
    width: var(--bt-sidebar-width, 360px) !important;
    min-width: var(--bt-sidebar-width, 360px) !important;
    max-width: var(--bt-sidebar-width, 360px) !important;
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
    
    &.side-right {
      left: auto;
      right: 0;
      border-right: none;
      border-left: 1px solid rgba($gold, 0.18);
      box-shadow: -4px 0 12px rgba(0,0,0,0.45);
      
      &.is-minimized {
        transform: translateX(100%);
      }
    }

    &.is-minimized {
      transform: translateX(-100%);
    }
  }

  .resize-handle {
    position: absolute;
    top: 0;
    right: -5px;
    width: 10px;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: col-resize;
    z-index: 3;

    &.side-right {
      right: auto;
      left: -5px;
    }

    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: 4px;
      width: 2px;
      height: 100%;
      background: linear-gradient(
        180deg,
        rgba($gold, 0.05),
        rgba($gold, 0.22) 20%,
        rgba($gold, 0.22) 80%,
        rgba($gold, 0.05)
      );
      transition: background-color 0.15s ease, opacity 0.15s ease;
      opacity: 0.85;
    }

    &::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 1px;
      width: 8px;
      height: 36px;
      transform: translateY(-50%);
      border-radius: 999px;
      background:
        radial-gradient(circle, rgba($gold, 0.38) 1px, transparent 1.5px) center 6px / 4px 8px repeat-y,
        rgba($black, 0.38);
      border: 1px solid rgba($gold, 0.16);
      box-shadow: 0 0 8px rgba($black, 0.28);
      transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
    }

    &:hover::after {
      opacity: 1;
      background: linear-gradient(
        180deg,
        rgba($gold, 0.08),
        rgba($gold, 0.4) 20%,
        rgba($gold, 0.4) 80%,
        rgba($gold, 0.08)
      );
    }

    &:hover::before {
      border-color: rgba($gold, 0.34);
      background:
        radial-gradient(circle, rgba($gold, 0.62) 1px, transparent 1.5px) center 6px / 4px 8px repeat-y,
        rgba($black, 0.52);
      transform: translateY(-50%) scale(1.02);
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

    &.side-right {
      left: auto;
      right: 0;
      border-right: 1px solid rgba($gold, 0.3);
      border-left: none;
      border-radius: 8px 0 0 8px;
      padding: 10px 6px 10px 8px;
      box-shadow: -2px 0 10px rgba($black, 0.5);

      &:hover {
        padding-right: 12px;
        padding-left: 8px;
      }
    }

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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
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

  .nav-item__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex: 0 0 14px;
    color: currentColor;
  }

  .nav-item__icon :global(.nav-svg) {
    width: 14px;
    height: 14px;
    display: block;
    stroke: currentColor;
    fill: none;
  }

  .nav-item__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-item--icon-only {
    flex: 0 0 32px;
    width: 32px;
    min-width: 32px;
    padding-left: 0;
    padding-right: 0;
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
    background: none;
    text-align: left;
    outline: none;

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
    scrollbar-width: thin;
    scrollbar-color: rgba($gold, 0.22) rgba($white, 0.04);
  }

  main::-webkit-scrollbar {
    width: 7px;
  }

  main::-webkit-scrollbar-track {
    background: rgba($white, 0.04);
  }

  main::-webkit-scrollbar-thumb {
    background: rgba($gold, 0.22);
    border-radius: 999px;
    border: 1px solid rgba($black, 0.45);
  }

  main::-webkit-scrollbar-thumb:hover {
    background: rgba($gold, 0.34);
  }

  main::-webkit-scrollbar-corner {
    background: transparent;
  }

  .floating-restore-btn {
    position: fixed;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    width: 44px;
    height: 60px;
    background: $poe-black;
    border: 1px solid $poe-gray;
    border-left: none;
    border-radius: 0 8px 8px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2147483647;
    transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
    box-shadow: 2px 0 8px rgba(0,0,0,0.4);
    padding: 0;
    outline: none;

    &:hover {
      background: color.adjust($poe-black, $lightness: 5%);
      border-color: $gold;
      width: 48px;
      
      .chev-icon {
        color: $gold;
        transform: scale(1.2);
      }
    }

    &.side-right {
      left: auto;
      right: 0;
      border-left: 1px solid $poe-gray;
      border-right: none;
      border-radius: 8px 0 0 8px;
      box-shadow: -2px 0 8px rgba(0,0,0,0.4);

      &:hover {
        width: 48px;
      }
    }

    .floater-logo {
      width: 24px;
      height: 24px;
      margin-bottom: 2px;
    }

    .chev-icon {
      font-size: 12px;
      color: rgba($white, 0.4);
      transition: all 0.2s ease;
    }
  }
</style>
