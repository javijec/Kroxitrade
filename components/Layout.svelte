<script lang="ts">
  import bookmarkIcon from "lucide-static/icons/bookmark.svg?raw";
  import clockIcon from "lucide-static/icons/history.svg?raw";
import infoIcon from "lucide-static/icons/info.svg?raw";
  import layersIcon from "lucide-static/icons/layers-3.svg?raw";
  import settingsIcon from "lucide-static/icons/settings-2.svg?raw";
  import Header from "./Header.svelte";
  import Bookmarks from "./pages/Bookmarks.svelte";
  import BulkSellers from "./pages/BulkSellers.svelte";
  import History from "./pages/History.svelte";
  import PinnedItems from "./pages/PinnedItems.svelte";
  import OnboardingModal from "./OnboardingModal.svelte";
import Settings from "./pages/Settings.svelte";
import About from "./pages/About.svelte";
  import FinerFilters from "./FinerFilters.svelte";
  import SvgIcon from "./SvgIcon.svelte";
  import WhatsNewDialog from "./WhatsNewDialog.svelte";
  import WelcomeDialog from "./WelcomeDialog.svelte";
  import logoUrl from "~assets/logo.webp?inline";
  import { flashMessages } from "../lib/services/flash";
  import { bookmarksService } from "../lib/services/bookmarks";
  import { hydrateActiveBookmarkFromTab } from "../lib/services/active-bookmark";
  import { languageStore, translate } from "../lib/services/i18n";
  import { DEFAULT_SIDEBAR_WIDTH, settings } from "../lib/services/settings";
  import { experimentalSettings } from "../lib/services/experimental";
  import { storageService } from "../lib/services/storage";
  import { tradeLocationService } from "../lib/services/trade-location";
  import { hasValidExtensionContext } from "../lib/utilities/extension-context";
  import type { BookmarksFolderStruct, BookmarksTradeStruct } from "../lib/types/bookmarks";
  import { onDestroy, onMount, tick } from "svelte";
  
  const MINIMIZED_STORAGE_KEY = "layout-minimized";
  const RESTORE_BUTTON_POSITION_STORAGE_KEY = "layout-restore-button-position";
  const WELCOME_SEEN_KEY = "layout-welcome-seen";
  const ONBOARDING_SEEN_KEY = "layout-onboarding-seen";
  const ONBOARDING_FOLDER_ID_KEY = "layout-onboarding-folder-id";
  const VERSION_NOTICE_SEEN_KEY = "layout-version-notice-seen";

  let currentPage: 'bookmarks' | 'bulk' | 'pinned' | 'history' | 'about' | 'settings' = $state('bookmarks');
  let currentTradeVersion: "1" | "2" = $state(tradeLocationService.current.version);
  let isMinimized = $state(false);
  let mainContentEl: HTMLElement | null = $state(null);
  let isResizing = $state(false);
  let isDraggingRestoreButton = $state(false);
  let liveSidebarWidth: number | null = null;
  let restoreButtonPosition = $state(50);
  let restoreButtonDragStartY = 0;
  let restoreButtonDragStartPosition = 50;
  let restoreButtonWasDragged = false;
  let loadedMinimizedStateKey: string | null = $state(null);
  let showOnboarding = $state(false);
  let showWelcome = $state(false);
  let welcomeLanguage = $state("en" as typeof $settings.language);
  let onboardingHighlightedPage: 'bookmarks' | 'bulk' | 'history' | 'about' | 'settings' | null = $state(null);
  let onboardingCurrentStepId:
    | 'create-folder'
    | 'save-search'
    | 'history'
    | 'settings-tutorial'
    | 'settings-sidebar'
    | 'settings-language'
    | 'settings-equivalent'
    | 'settings-bulk'
    | 'settings-history'
    | 'settings-bookmarks'
    | null = $state(null);
  let onboardingTutorialFolderId: string | null = $state(null);
  let appVersion = $state(hasValidExtensionContext()
    ? chrome.runtime.getManifest().version
    : "dev");
  let isDevBuild = $state(import.meta.env.DEV);
  let showVersionNotice = $state(false);
  let showWhatsNew = $state(false);

  const MIN_SIDEBAR_WIDTH = 300;
  const MAX_SIDEBAR_WIDTH = 560;
  const MINIMIZED_WIDTH = 0;
  const RESTORE_BUTTON_HALF_HEIGHT = 30;

  const clampSidebarWidth = (value: number) =>
    Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, Math.round(value)));

  const getExpandedSidebarWidth = () => clampSidebarWidth($settings.sidebarWidth || DEFAULT_SIDEBAR_WIDTH);
  const getRenderedSidebarWidth = () => clampSidebarWidth(liveSidebarWidth ?? getExpandedSidebarWidth());

  const navIcons = {
    bookmarks: bookmarkIcon,
    bulk: layersIcon,
    history: clockIcon,
    settings: settingsIcon,
    about: infoIcon
  };

  const getTutorialTradeStruct = (): BookmarksTradeStruct => {
    const current = tradeLocationService.current;

    return {
      title: translate($languageStore, "onboarding.sampleTrade"),
      completedAt: null,
      archivedAt: null,
      location: {
        version: current.version,
        type: current.type || "search",
        slug: current.slug || "tutorial-example",
        league: current.league || "Standard"
      }
    };
  };

  const cleanupTutorialArtifacts = async (folderId = onboardingTutorialFolderId) => {
    if (!folderId) return;

    try {
      await bookmarksService.deleteFolder(folderId);
    } catch {
      // Ignore cleanup failures; the next onboarding run can overwrite the sample.
    } finally {
      if (folderId === onboardingTutorialFolderId) {
        onboardingTutorialFolderId = null;
      }
      storageService.deleteLocalValue(ONBOARDING_FOLDER_ID_KEY);
    }
  };

  const ensureTutorialArtifacts = async () => {
    const persistedFolderId = storageService.getLocalValue(ONBOARDING_FOLDER_ID_KEY);
    if (persistedFolderId) {
      await cleanupTutorialArtifacts(persistedFolderId);
    }

    const tutorialFolder: BookmarksFolderStruct = {
      title: translate($languageStore, "onboarding.sampleFolder"),
      icon: null,
      version: tradeLocationService.current.version,
      archivedAt: null
    };

    const folderId = await bookmarksService.persistFolder(tutorialFolder);
    onboardingTutorialFolderId = folderId;
    storageService.setLocalValue(ONBOARDING_FOLDER_ID_KEY, folderId);
    await bookmarksService.persistTrade(getTutorialTradeStruct(), folderId);
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

  const clampRestoreButtonPosition = (position: number) =>
    Math.max(
      RESTORE_BUTTON_HALF_HEIGHT,
      Math.min(window.innerHeight - RESTORE_BUTTON_HALF_HEIGHT, position)
    );

  const loadRestoreButtonPosition = (storageKey: string) => {
    const storedPosition = Number(storageService.getLocalValue(storageKey));
    restoreButtonPosition = Number.isFinite(storedPosition)
      ? clampRestoreButtonPosition(storedPosition)
      : window.innerHeight / 2;
  };

  const startRestoreButtonDrag = (event: MouseEvent) => {
    if (event.button !== 0) return;

    event.preventDefault();
    isDraggingRestoreButton = true;
    restoreButtonWasDragged = false;
    restoreButtonDragStartY = event.clientY;
    restoreButtonDragStartPosition = restoreButtonPosition;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  };

  const handleRestoreButtonDrag = (event: MouseEvent) => {
    if (!isDraggingRestoreButton) return;

    const distance = event.clientY - restoreButtonDragStartY;
    if (Math.abs(distance) > 3) restoreButtonWasDragged = true;
    restoreButtonPosition = clampRestoreButtonPosition(
      restoreButtonDragStartPosition + distance
    );
  };

  const stopRestoreButtonDrag = () => {
    if (!isDraggingRestoreButton) return;

    isDraggingRestoreButton = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    storageService.setLocalValue(restoreButtonPositionStorageKey, String(restoreButtonPosition));
  };

  const restoreFromButton = () => {
    if (restoreButtonWasDragged) {
      restoreButtonWasDragged = false;
      return;
    }
    toggleMinimize();
  };

  onMount(async () => {
    await settings.load();
    await hydrateActiveBookmarkFromTab();
    tradeLocationService.startPolling();
    const unsubscribeLocation = tradeLocationService.locationStore.subscribe((location) => {
      currentTradeVersion = location.version;
      void settings.useVersion(location.version);
      experimentalSettings.useVersion(location.version);
    });
    welcomeLanguage = $settings.language;
    isDevBuild = import.meta.env.DEV;
    appVersion = hasValidExtensionContext()
      ? chrome.runtime.getManifest().version
      : "dev";
    const seenVersionNotice = storageService.getLocalValue(VERSION_NOTICE_SEEN_KEY);
    if (appVersion !== "dev") {
      if (seenVersionNotice && seenVersionNotice !== appVersion) {
        showVersionNotice = true;
      } else if (!seenVersionNotice) {
        storageService.setLocalValue(VERSION_NOTICE_SEEN_KEY, appVersion);
      }
    }
    const shouldShowWelcome = storageService.getLocalValue(WELCOME_SEEN_KEY) !== "true";
    const shouldShowOnboarding = storageService.getLocalValue(ONBOARDING_SEEN_KEY) !== "true";
    if (shouldShowWelcome) {
      showWelcome = true;
    } else if (shouldShowOnboarding) {
      await openOnboarding();
    }

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', stopResize);
    window.addEventListener('mouseleave', stopResize);
    window.addEventListener('mousemove', handleRestoreButtonDrag);
    window.addEventListener('mouseup', stopRestoreButtonDrag);
    window.addEventListener('mouseleave', stopRestoreButtonDrag);

    return () => {
      unsubscribeLocation();
      tradeLocationService.stopPolling();
    };
  });

  const closeOnboarding = async () => {
    showOnboarding = false;
    onboardingHighlightedPage = null;
    onboardingCurrentStepId = null;
    storageService.setLocalValue(ONBOARDING_SEEN_KEY, "true");
    await cleanupTutorialArtifacts();
  };

  const openOnboarding = async () => {
    await ensureTutorialArtifacts();
    currentPage = 'bookmarks';
    onboardingHighlightedPage = 'bookmarks';
    onboardingCurrentStepId = 'create-folder';
    await tick();
    await tick();
    showOnboarding = true;
  };

  const confirmWelcome = async () => {
    await settings.updateLanguage(welcomeLanguage);
    storageService.setLocalValue(WELCOME_SEEN_KEY, "true");
    showWelcome = false;

    if (storageService.getLocalValue(ONBOARDING_SEEN_KEY) !== "true") {
      await openOnboarding();
    }
  };

  const dismissVersionNotice = () => {
    showVersionNotice = false;
    if (appVersion !== "dev") {
      storageService.setLocalValue(VERSION_NOTICE_SEEN_KEY, appVersion);
    }
  };

  const openWhatsNew = () => {
    showWhatsNew = true;
  };

  const closeWhatsNew = () => {
    showWhatsNew = false;
    dismissVersionNotice();
  };

  const handleOnboardingStepChange = (
    page: 'bookmarks' | 'bulk' | 'history' | 'about' | 'settings',
    stepId:
      | 'create-folder'
      | 'save-search'
      | 'history'
      | 'settings-tutorial'
      | 'settings-sidebar'
      | 'settings-language'
      | 'settings-equivalent'
      | 'settings-bulk'
      | 'settings-history'
      | 'settings-bookmarks'
  ) => {
    onboardingHighlightedPage = page;
    onboardingCurrentStepId = stepId;
    if (stepId === 'history') {
      void cleanupTutorialArtifacts();
    }
    if (page === 'bulk' && !$settings.showBulkSellers) return;
    if (page === 'history' && !$settings.showHistory) return;
    currentPage = page;
  };

  onDestroy(() => {
    experimentalSettings.teardown();
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', stopResize);
    window.removeEventListener('mouseleave', stopResize);
    window.removeEventListener('mousemove', handleRestoreButtonDrag);
    window.removeEventListener('mouseup', stopRestoreButtonDrag);
    window.removeEventListener('mouseleave', stopRestoreButtonDrag);
  });

  $effect(() => {
    if (!$settings.showBulkSellers && currentPage === 'bulk') {
      currentPage = 'bookmarks';
    }
  });

  $effect(() => {
    if (!$settings.showHistory && currentPage === 'history') {
      currentPage = 'bookmarks';
    }
  });
  $effect(() => {
    if (!$settings.showPinnedItems && currentPage === 'pinned') currentPage = 'bookmarks';
  });

  const currentLocation = tradeLocationService.locationStore;
  let minimizedStorageKey = $derived(`${MINIMIZED_STORAGE_KEY}-${$currentLocation.version}`);
  let restoreButtonPositionStorageKey = $derived(`${RESTORE_BUTTON_POSITION_STORAGE_KEY}-${$currentLocation.version}`);
  $effect(() => {
    if (minimizedStorageKey && loadedMinimizedStateKey !== minimizedStorageKey) {
      loadMinimizedState(minimizedStorageKey);
      loadRestoreButtonPosition(restoreButtonPositionStorageKey);
    }
  });
  $effect(() => {
    if (loadedMinimizedStateKey === minimizedStorageKey) {
      persistMinimizedState(minimizedStorageKey, isMinimized);
    }
  });

  $effect(() => {
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

      const hosts = document.querySelectorAll('#kroxitrade-root');
      hosts.forEach((h: HTMLElement) => {
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
  });
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
      onmousedown={startResize}
    ></button>
  {/if}

  <Header
    {logoUrl}
    {isMinimized}
    {isDevBuild}
    onToggleMinimize={toggleMinimize}
    sidebarSide={$settings.sidebarSide}
  />

  {#if showVersionNotice}
    <div class="version-notice" role="status" aria-live="polite">
      <div class="version-notice__copy">
        <span class="version-notice__eyebrow">
          {translate($languageStore, "layout.versionNoticeEyebrow")}
        </span>
        <p class="version-notice__text">
          {translate($languageStore, "layout.versionNoticeMessage", {
            version: appVersion
          })}
        </p>
      </div>
      <button
        type="button"
        class="version-notice__open"
        onclick={openWhatsNew}
      >
        {translate($languageStore, "layout.versionNoticeOpen")}
      </button>
      <button
        type="button"
        class="version-notice__close"
        aria-label={translate($languageStore, "layout.versionNoticeClose")}
        onclick={dismissVersionNotice}
      >
        ×
      </button>
    </div>
  {/if}
  
  <nav class="main-nav">
    <button 
        class="nav-item {currentPage === 'bookmarks' ? 'is-active' : ''} {showOnboarding && onboardingHighlightedPage === 'bookmarks' ? 'is-onboarding-focus' : ''}" 
        data-tutorial="nav-bookmarks"
        onclick={() => currentPage = 'bookmarks'}
    >
        <span class="nav-item__icon" aria-hidden="true"><SvgIcon svg={navIcons.bookmarks} size={14} className="nav-svg" /></span>
        <span class="nav-item__label">{translate($languageStore, "layout.nav.bookmarks")}</span>
    </button>

    {#if $settings.showBulkSellers}
      <button 
          class="nav-item {currentPage === 'bulk' ? 'is-active' : ''} {showOnboarding && onboardingHighlightedPage === 'bulk' ? 'is-onboarding-focus' : ''}" 
          data-tutorial="nav-bulk"
          onclick={() => currentPage = 'bulk'}
      >
          <span class="nav-item__icon" aria-hidden="true"><SvgIcon svg={navIcons.bulk} size={14} className="nav-svg" /></span>
          <span class="nav-item__label">{translate($languageStore, "layout.nav.bulk")}</span>
      </button>
    {/if}

    {#if $settings.showPinnedItems}
      <button class="nav-item {currentPage === 'pinned' ? 'is-active' : ''}" onclick={() => currentPage = 'pinned'}>
        <span class="nav-item__label">{translate($languageStore, "settings.pinnedTitle")}</span>
      </button>
    {/if}
    {#if $settings.showHistory}
      <button 
          class="nav-item {currentPage === 'history' ? 'is-active' : ''} {showOnboarding && onboardingHighlightedPage === 'history' ? 'is-onboarding-focus' : ''}" 
          data-tutorial="nav-history"
          onclick={() => currentPage = 'history'}
      >
          <span class="nav-item__icon" aria-hidden="true"><SvgIcon svg={navIcons.history} size={14} className="nav-svg" /></span>
          <span class="nav-item__label">{translate($languageStore, "layout.nav.history")}</span>
      </button>
    {/if}
    <button 
        class="nav-item nav-item--settings {currentPage === 'settings' ? 'is-active' : ''} {showOnboarding && onboardingHighlightedPage === 'settings' ? 'is-onboarding-focus' : ''}" 
        data-tutorial="nav-settings"
        title={translate($languageStore, "layout.nav.settings")}
        aria-label={translate($languageStore, "layout.nav.settings")}
        onclick={() => currentPage = 'settings'}
    >
        <span class="nav-item__icon" aria-hidden="true"><SvgIcon svg={navIcons.settings} size={14} className="nav-svg" /></span>
        <span class="nav-item__label">{translate($languageStore, "layout.nav.settings")}</span>
    </button>
    <button 
        class="nav-item nav-item--icon-only {currentPage === 'about' ? 'is-active' : ''} {showOnboarding && onboardingHighlightedPage === 'about' ? 'is-onboarding-focus' : ''}" 
        title={translate($languageStore, "layout.nav.about")}
        aria-label={translate($languageStore, "layout.nav.about")}
        onclick={() => currentPage = 'about'}
    >
        <span class="nav-item__icon" aria-hidden="true"><SvgIcon svg={navIcons.about} size={14} className="nav-svg" /></span>
    </button>
  </nav>

  <div class="flash-messages" aria-live="polite" aria-atomic="true">
    {#each $flashMessages as flash (flash.id)}
      <button 
        class="flash flash-{flash.type}" 
        onclick={() => flashMessages.remove(flash.id)}
        aria-label={translate($languageStore, "layout.removeAlert")}
      >
        {flash.message}
      </button>
    {/each}
  </div>

  <main bind:this={mainContentEl}>
    {#if currentPage === 'bookmarks'}
        <Bookmarks
          scrollContainer={mainContentEl}
          tutorialStep={showOnboarding ? onboardingCurrentStepId : null}
          tutorialFolderId={showOnboarding ? onboardingTutorialFolderId : null} />
    {:else if currentPage === 'bulk' && $settings.showBulkSellers}
        <BulkSellers />
    {:else if currentPage === 'pinned' && $settings.showPinnedItems}
        <PinnedItems />
    {:else if currentPage === 'history' && $settings.showHistory}
        <History />
    {:else if currentPage === 'settings'}
        <Settings
          tutorialStep={showOnboarding ? onboardingCurrentStepId : null} />
    {:else if currentPage === 'about'}
        <About onOpenWhatsNew={openWhatsNew} onOpenTutorial={openOnboarding} />
    {/if}
  </main>

  {#if $settings.showQuickFilters && $settings.quickFiltersPlacement === 'sidebar'}
    <FinerFilters />
  {/if}

  <OnboardingModal
    open={showOnboarding}
    showEquivalentStep={true}
    onClose={closeOnboarding}
    onStepChange={handleOnboardingStepChange} />

  <WelcomeDialog
    open={showWelcome}
    selectedLanguage={welcomeLanguage}
    onSelectLanguage={(language) => {
      welcomeLanguage = language;
    }}
    onConfirm={confirmWelcome} />

  <WhatsNewDialog
    open={showWhatsNew}
    version={appVersion}
    onClose={closeWhatsNew} />
</div>

{#if isMinimized}
  <button 
    class="floating-restore-btn" 
    class:side-right={$settings.sidebarSide === 'right'}
    class:is-dragging={isDraggingRestoreButton}
    style:top={`${restoreButtonPosition}px`}
    onmousedown={startRestoreButtonDrag}
    onclick={restoreFromButton}
    aria-label={translate($languageStore, "layout.restorePanel")}
  >
    <img src={logoUrl} alt="Logo" class="floater-logo" />
    <span class="chev-icon">{$settings.sidebarSide === 'right' ? "◀" : "▶"}</span>
  </button>
{/if}

<style>
#kroxitrade-container {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--bt-sidebar-width, 450px) !important;
  min-width: var(--bt-sidebar-width, 450px) !important;
  max-width: var(--bt-sidebar-width, 450px) !important;
  height: 100vh;
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  background-color: #050505;
  display: flex;
  flex-direction: column;
  container-type: inline-size;
  font-family: Verdana, Arial, Helvetica, sans-serif;
  color: #eeeeee;
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  pointer-events: auto;
}
#kroxitrade-container.side-right {
  left: auto;
  right: 0;
  border-right: none;
  border-left: 1px solid rgba(163, 141, 109, 0.18);
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.45);
}
#kroxitrade-container.side-right.is-minimized {
  transform: translateX(100%);
}
#kroxitrade-container.is-minimized {
  transform: translateX(-100%);
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
}
.resize-handle.side-right {
  right: auto;
  left: -5px;
}
.resize-handle::after {
  content: "";
  position: absolute;
  top: 0;
  left: 4px;
  width: 2px;
  height: 100%;
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.05), rgba(163, 141, 109, 0.22) 20%, rgba(163, 141, 109, 0.22) 80%, rgba(163, 141, 109, 0.05));
  transition: background-color 0.15s ease, opacity 0.15s ease;
  opacity: 0.85;
}
.resize-handle::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 1px;
  width: 8px;
  height: 36px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: radial-gradient(circle, rgba(163, 141, 109, 0.38) 1px, transparent 1.5px) center 6px/4px 8px repeat-y, rgba(5, 5, 5, 0.38);
  border: 1px solid rgba(163, 141, 109, 0.16);
  box-shadow: 0 0 8px rgba(5, 5, 5, 0.28);
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}
.resize-handle:hover::after {
  opacity: 1;
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.08), rgba(163, 141, 109, 0.4) 20%, rgba(163, 141, 109, 0.4) 80%, rgba(163, 141, 109, 0.08));
}
.resize-handle:hover::before {
  border-color: rgba(163, 141, 109, 0.34);
  background: radial-gradient(circle, rgba(163, 141, 109, 0.62) 1px, transparent 1.5px) center 6px/4px 8px repeat-y, rgba(5, 5, 5, 0.52);
  transform: translateY(-50%) scale(1.02);
}

.floating-restore-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(5, 5, 5, 0.6);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(163, 141, 109, 0.3);
  border-left: none;
  padding: 10px 8px 10px 6px;
  border-radius: 0 8px 8px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 2px 0 10px rgba(5, 5, 5, 0.5);
  transition: background-color 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), padding 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  z-index: 2147483647;
  pointer-events: auto;
}
.floating-restore-btn.side-right {
  left: auto;
  right: 0;
  border-right: 1px solid rgba(163, 141, 109, 0.3);
  border-left: none;
  border-radius: 8px 0 0 8px;
  padding: 10px 6px 10px 8px;
  box-shadow: -2px 0 10px rgba(5, 5, 5, 0.5);
}
.floating-restore-btn.side-right:hover {
  padding-right: 12px;
  padding-left: 8px;
}
.floating-restore-btn:hover {
  background: rgba(5, 5, 5, 0.8);
  border-color: #a38d6d;
  box-shadow: 4px 0 15px rgba(163, 141, 109, 0.15);
  padding-left: 8px; /* slight peek effect */
}
.floating-restore-btn .floater-logo {
  width: 22px;
  height: auto;
  pointer-events: none;
  filter: drop-shadow(0 0 2px rgba(5, 5, 5, 0.8));
}
.floating-restore-btn .chev-icon {
  color: #a38d6d;
  font-size: calc(11px * var(--bt-text-scale, 1));
}

.main-nav {
  display: flex;
  width: 100%;
  min-width: 0;
  background-color: rgba(238, 238, 238, 0.02);
  border-bottom: 1px solid rgba(238, 238, 238, 0.08);
  padding: 0 8px;
  box-sizing: border-box;
}

.version-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-top: 1px solid rgba(163, 141, 109, 0.08);
  border-bottom: 1px solid rgba(163, 141, 109, 0.12);
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.08), rgba(163, 141, 109, 0.04)), rgba(5, 5, 5, 0.5);
}

.version-notice__copy {
  min-width: 0;
  flex: 1;
}

.version-notice__eyebrow {
  display: block;
  margin-bottom: 2px;
  color: rgba(196, 177, 140, 0.92);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(9px * var(--bt-text-scale, 1));
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.version-notice__text {
  margin: 0;
  color: rgba(238, 238, 238, 0.84);
  font-size: calc(10px * var(--bt-text-scale, 1));
  line-height: 1.35;
}

.version-notice__close {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid rgba(163, 141, 109, 0.18);
  border-radius: 6px;
  background: rgba(5, 5, 5, 0.22);
  color: rgba(196, 177, 140, 0.88);
  font-size: calc(14px * var(--bt-text-scale, 1));
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.version-notice__close:hover, .version-notice__close:focus-visible {
  border-color: rgba(163, 141, 109, 0.36);
  background: rgba(5, 5, 5, 0.42);
  color: #c4b18c;
  outline: none;
}

.version-notice__open {
  flex: 0 0 auto;
  height: 24px;
  padding: 0 9px;
  border: 1px solid rgba(163, 141, 109, 0.26);
  border-radius: 4px;
  background: rgba(163, 141, 109, 0.08);
  color: rgba(196, 177, 140, 0.94);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(10px * var(--bt-text-scale, 1));
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.version-notice__open:hover, .version-notice__open:focus-visible {
  border-color: rgba(163, 141, 109, 0.48);
  background: rgba(163, 141, 109, 0.14);
  color: #c4b18c;
  outline: none;
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
  border-radius: 0;
  color: rgba(238, 238, 238, 0.56);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(11px * var(--bt-text-scale, 1));
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease, border-bottom-color 0.2s ease, box-shadow 0.2s ease;
  border-bottom: 1px solid transparent;
}
.nav-item:hover {
  color: #eeeeee;
  border-bottom-color: rgba(163, 141, 109, 0.22);
  background-color: rgba(238, 238, 238, 0.03);
}
.nav-item.is-active {
  color: #eeeeee;
  border-bottom-color: #a38d6d;
  background-color: rgba(238, 238, 238, 0.04);
}
.nav-item:focus-visible {
  color: #eeeeee;
  background-color: rgba(163, 141, 109, 0.08);
  border-bottom-color: rgba(163, 141, 109, 0.72);
  box-shadow: inset 0 0 0 1px rgba(163, 141, 109, 0.22);
}
.nav-item.is-onboarding-focus {
  color: #fff3d7;
  border-bottom-color: rgba(163, 141, 109, 0.72);
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.16), rgba(163, 141, 109, 0.06)), rgba(238, 238, 238, 0.04);
  box-shadow: inset 0 1px 0 rgba(255, 231, 187, 0.08), 0 0 0 1px rgba(163, 141, 109, 0.12);
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

@container (max-width: 359px) {
  .nav-item--settings {
    flex: 0 0 32px;
    width: 32px;
    min-width: 32px;
    gap: 0;
    padding-left: 0;
    padding-right: 0;
  }
  .nav-item--settings .nav-item__label {
    display: none;
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
  color: #eeeeee;
  font-size: calc(13px * var(--bt-text-scale, 1));
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  background: none;
  text-align: left;
  border: 1px solid transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.flash:focus-visible {
  border-color: rgba(238, 238, 238, 0.88);
  box-shadow: 0 0 0 1px rgba(5, 5, 5, 0.48), 0 0 0 3px rgba(238, 238, 238, 0.18);
}
.flash-success {
  background-color: #1e4d1e;
  border-color: rgb(44.2990654206, 113.7009345794, 44.2990654206);
}
.flash-alert {
  background-color: #6d1c1c;
  border-color: rgb(149.5766423358, 38.4233576642, 38.4233576642);
}
.flash-info {
  background-color: #0f1c2e;
  border-color: rgb(27.5409836066, 51.4098360656, 84.4590163934);
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
  background-color: #050505;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(163, 141, 109, 0.22) rgba(238, 238, 238, 0.04);
}

main::-webkit-scrollbar {
  width: 7px;
}

main::-webkit-scrollbar-track {
  background: rgba(238, 238, 238, 0.04);
}

main::-webkit-scrollbar-thumb {
  background: rgba(163, 141, 109, 0.22);
  border-radius: 999px;
  border: 1px solid rgba(5, 5, 5, 0.45);
}

main::-webkit-scrollbar-thumb:hover {
  background: rgba(163, 141, 109, 0.34);
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
  background: #050505;
  border: 1px solid #333333;
  border-left: none;
  border-radius: 0 8px 8px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2147483647;
  transition: background-color 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), border-color 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), width 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.4);
  padding: 0;
}
.floating-restore-btn:hover {
  background: rgb(17.75, 17.75, 17.75);
  border-color: #a38d6d;
  width: 48px;
}
.floating-restore-btn.is-dragging {
  cursor: grabbing;
  transition: none;
}
.floating-restore-btn:hover .chev-icon {
  color: #a38d6d;
  transform: scale(1.2);
}
.floating-restore-btn:focus-visible {
  border-color: rgba(163, 141, 109, 0.8);
  box-shadow: 0 0 0 1px rgba(163, 141, 109, 0.26), 0 0 0 3px rgba(163, 141, 109, 0.14);
}
.floating-restore-btn.side-right {
  left: auto;
  right: 0;
  border-left: 1px solid #333333;
  border-right: none;
  border-radius: 8px 0 0 8px;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.4);
}
.floating-restore-btn.side-right:hover {
  width: 48px;
}
.floating-restore-btn .floater-logo {
  width: 24px;
  height: 24px;
  margin-bottom: 2px;
}
.floating-restore-btn .chev-icon {
  font-size: calc(12px * var(--bt-text-scale, 1));
  color: rgba(238, 238, 238, 0.4);
  transition: color 0.2s ease, transform 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  #kroxitrade-container,
  .resize-handle::after,
  .resize-handle::before,
  .floating-restore-btn,
  .floating-restore-btn .chev-icon,
  .nav-item,
  .flash {
    transition: none !important;
  }
}
</style>
