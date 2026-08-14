<script lang="ts">
  import { flip } from "svelte/animate";
  import { onDestroy, onMount, tick } from "svelte";
  import archiveIcon from "lucide-static/icons/archive.svg?raw";
  import archiveRestoreIcon from "lucide-static/icons/archive-restore.svg?raw";
  import chevronsUpIcon from "lucide-static/icons/chevrons-up.svg?raw";
  import downloadIcon from "lucide-static/icons/download.svg?raw";
  import folderPlusIcon from "lucide-static/icons/folder-plus.svg?raw";
  import xIcon from "lucide-static/icons/x.svg?raw";
  import { languageStore, translate } from "../../lib/services/i18n";
  import { bookmarksService } from "../../lib/services/bookmarks";
  import {
    clearBookmarkScroll,
    consumeBookmarkScroll
  } from "../../lib/services/bookmark-scroll";
  import { tradeLocationService } from "../../lib/services/trade-location";
  import { flashMessages } from "../../lib/services/flash";
  import { storageService } from "../../lib/services/storage";
  import {
    BOOKMARK_DRAG_MIME_TYPE,
    parseBookmarkDragPayload,
    setBookmarkDragPayload,
    type BookmarkDragPayload
  } from "../../lib/types/bookmark-drag";
  import type { BookmarksFolderStruct } from "../../lib/types/bookmarks";

  import BookmarkFolder from "../BookmarkFolder.svelte";
  import Button from "../Button.svelte";
  import ConfirmDialog from "../ConfirmDialog.svelte";
  import EmptyState from "../EmptyState.svelte";
  import LoadingContainer from "../LoadingContainer.svelte";
  import SvgIcon from "../SvgIcon.svelte";

  const EXPANDED_FOLDERS_STORAGE_KEY = "bookmark-folders-expanded";

  interface Props {
    tutorialStep?: 
    | "create-folder"
    | "save-search"
    | "history"
    | "settings-tutorial"
    | "settings-sidebar"
    | "settings-language"
    | "settings-equivalent"
    | "settings-bulk"
    | "settings-history"
    | "settings-bookmarks"
    | null;
    tutorialFolderId?: string | null;
    scrollContainer?: HTMLElement | null;
  }

  let {
    tutorialStep = null,
    tutorialFolderId = null,
    scrollContainer = null
  }: Props = $props();

  let expandedFolderIds: string[] = $state([]);
  let isLoading = false;
  let showArchived = $state(false);
  let hasLoadedExpandedState = $state(false);
  
  let isImportingText = $state(false);
  let importText = $state("");
  let draggedFolderId: string | null = $state(null);
  let dragOverFolderId: string | null = $state(null);
  let folderPendingDelete: BookmarksFolderStruct | null = $state(null);
  let pendingEditFolderId: string | null = $state(null);
  let newFolderEditId: string | null = $state(null);
  let toolbarStickyEl: HTMLDivElement | null = $state(null);
  let toolbarRenderKey = $state(0);
  let toolbarRepairFrame = 0;
  let toolbarRepairTimeouts: number[] = [];
  let toolbarRepairAttempts = 0;
  let isAtBookmarkTop = $state(true);


  const normalizeExpandedFolderIds = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.filter((id): id is string => typeof id === "string");
    }

    if (value && typeof value === "object") {
      const parsed = value as Record<string, unknown>;
      const legacyEntry = parsed[currentVersion];
      if (Array.isArray(legacyEntry)) {
        return legacyEntry.filter((id): id is string => typeof id === "string");
      }
    }

    return [];
  };

  const loadExpandedState = () => {
    const globalRaw = storageService.getLocalValue(EXPANDED_FOLDERS_STORAGE_KEY);

    try {
      const parsed = globalRaw ? JSON.parse(globalRaw) : null;
      const nextExpanded = normalizeExpandedFolderIds(parsed);
      if (nextExpanded.length > 0) {
        expandedFolderIds = nextExpanded;
        hasLoadedExpandedState = true;
        return;
      }
    } catch {
      // Fall through to the legacy per-version key.
    }

    const legacyStorageKey = `${EXPANDED_FOLDERS_STORAGE_KEY}-${currentVersion}`;
    const legacyRaw = storageService.getLocalValue(legacyStorageKey);

    try {
      const parsed = legacyRaw ? JSON.parse(legacyRaw) : [];
      expandedFolderIds = normalizeExpandedFolderIds(parsed);
    } catch {
      expandedFolderIds = [];
    }

    hasLoadedExpandedState = true;
  };

  const persistExpandedState = (folderIds: string[]) => {
    storageService.setLocalValue(EXPANDED_FOLDERS_STORAGE_KEY, JSON.stringify(folderIds));
  };

  const toggleExpansion = (id: string) => {
    if (expandedFolderIds.includes(id)) {
      expandedFolderIds = expandedFolderIds.filter(fid => fid !== id);
    } else {
      expandedFolderIds = [...expandedFolderIds, id];
    }
  };

  const createFolder = async () => {
    const newFolder: BookmarksFolderStruct = {
      title: translate($languageStore, "bookmarks.newFolder"),
      icon: null,
      version: currentVersion,
      archivedAt: null
    };
    const folderId = await bookmarksService.persistFolder(newFolder);
    if (folderId && !expandedFolderIds.includes(folderId)) {
      expandedFolderIds = [...expandedFolderIds, folderId];
    }
    pendingEditFolderId = folderId;
    newFolderEditId = folderId;
    flashMessages.success(translate($languageStore, "bookmarks.folderCreated"));
  };

  const confirmNewFolderEdit = (folderId: string | undefined) => {
    if (newFolderEditId === folderId) newFolderEditId = null;
  };

  const cancelNewFolderEdit = async (folderId: string | undefined) => {
    if (!folderId || newFolderEditId !== folderId) return;
    newFolderEditId = null;
    pendingEditFolderId = null;
    expandedFolderIds = expandedFolderIds.filter((id) => id !== folderId);
    if (!(await bookmarksService.deleteFolder(folderId))) {
      flashMessages.alert(translate($languageStore, "bookmarks.folderDeleteError"));
    }
  };

  const toggleArchive = async (folder: BookmarksFolderStruct) => {
    await bookmarksService.toggleFolderArchive(folder);
  };

  const deleteFolder = (folder: BookmarksFolderStruct) => {
    if (!folder.id) return;
    folderPendingDelete = null;
    void bookmarksService.deleteFolder(folder.id).then((deleted) => {
      if (deleted) {
        flashMessages.success(translate($languageStore, "bookmarks.folderDeleted"));
      } else {
        flashMessages.alert(translate($languageStore, "bookmarks.folderDeleteError"));
      }
    });
  };

  const requestFolderDelete = (folder: BookmarksFolderStruct) => {
    folderPendingDelete = folder;
  };

  const cancelFolderDelete = () => {
    folderPendingDelete = null;
  };

  const collapseAll = () => {
      expandedFolderIds = [];
  };

  const parseDragPayload = (event: DragEvent): BookmarkDragPayload | null => {
    if (!event.dataTransfer) return null
    const primary = parseBookmarkDragPayload(
      event.dataTransfer.getData(BOOKMARK_DRAG_MIME_TYPE)
    )
    if (primary) return primary

    const legacy = parseBookmarkDragPayload(event.dataTransfer.getData("text/plain"))
    if (legacy) return legacy

    const legacyFolderId = event.dataTransfer.getData("text/plain")
    return displayedFolderIndexById.has(legacyFolderId)
      ? { type: "folder", folderId: legacyFolderId }
      : null
  }

  const handleFolderDragStart = (event: DragEvent, folderId: string) => {
    draggedFolderId = folderId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      setBookmarkDragPayload(event.dataTransfer, { type: "folder", folderId });
    }
  };

  const handleFolderDragEnter = (event: DragEvent, folderId: string) => {
    const payload = parseDragPayload(event);
    if (!payload) return;

    event.preventDefault();
    if (payload.type === "folder" && draggedFolderId && draggedFolderId !== folderId) {
      dragOverFolderId = folderId;
      return;
    }

    if (payload.type === "trade" && payload.sourceFolderId !== folderId) {
      dragOverFolderId = folderId;
    }

    if (payload.type === "category" && payload.folderId !== folderId) {
      dragOverFolderId = folderId;
    }
  };

  const handleFolderDrop = async (event: DragEvent, folderId: string) => {
    event.preventDefault();
    dragOverFolderId = null;

    const payload = parseDragPayload(event);
    if (!payload) {
      draggedFolderId = null;
      return;
    }

    if (payload.type === "folder") {
      if (!draggedFolderId || draggedFolderId === folderId) {
        draggedFolderId = null;
        return;
      }

      const targetIndex = displayedFolderIndexById.get(folderId) ?? -1;
      if (targetIndex === -1) {
        draggedFolderId = null;
        return;
      }

      await bookmarksService.moveFolder(draggedFolderId, targetIndex, {
        version: currentVersion,
        archived: showArchived
      });
      draggedFolderId = null;
      return;
    }

    if (payload.type === "trade" && payload.sourceFolderId !== folderId) {
      try {
        await bookmarksService.moveTradeBetweenFolders(
          payload.tradeId,
          payload.sourceFolderId,
          folderId
        );
      } catch {
        await bookmarksService.refresh();
        flashMessages.alert(translate($languageStore, "bookmarks.restoreFailed"));
      }
    }

    if (payload.type === "category" && payload.folderId !== folderId) {
      try {
        await bookmarksService.moveCategoryBetweenFolders(
          payload.categoryId,
          payload.folderId,
          folderId
        );
      } catch {
        await bookmarksService.refresh();
        flashMessages.alert(translate($languageStore, "bookmarks.restoreFailed"));
      }
    }

    draggedFolderId = null;
  };

  const handleFolderDragEnd = () => {
    draggedFolderId = null;
    dragOverFolderId = null;
  };

  const processTextImport = async () => {
      const serialized = importText.trim();
      if (!serialized) {
          flashMessages.alert(translate($languageStore, "bookmarks.pasteFolderData"));
          return;
      }

      const deserialized = bookmarksService.deserializeFolder(serialized);
      if (!deserialized) {
          flashMessages.alert(translate($languageStore, "bookmarks.invalidFolderData"));
          return;
      }

      const [folder, trades] = deserialized;
      const folderId = await bookmarksService.persistFolder(folder);
      await bookmarksService.persistTrades(trades, folderId);
      
      flashMessages.success(translate($languageStore, "bookmarks.importedFolder", { title: folder.title }));
      importText = "";
      isImportingText = false;
  };

  const toolbarIcons = {
    newFolder: folderPlusIcon,
    import: downloadIcon,
    cancel: xIcon,
    collapse: chevronsUpIcon,
    archive: archiveIcon,
    active: archiveRestoreIcon
  };

  const syncBookmarkTop = () => {
    isAtBookmarkTop = !scrollContainer || scrollContainer.scrollTop <= 0;
  };

  const restoreBookmarkScroll = async () => {
    if (!scrollContainer) return true;

    const top = await consumeBookmarkScroll();
    if (top === null) return true;

    scrollContainer.scrollTop = top;
    syncBookmarkTop();
    const canReachSavedPosition =
      scrollContainer.scrollHeight - scrollContainer.clientHeight >= top;
    if (canReachSavedPosition) await clearBookmarkScroll();
    return canReachSavedPosition;
  };

  const clearToolbarRepairTimers = () => {
    if (toolbarRepairFrame) {
      window.cancelAnimationFrame(toolbarRepairFrame);
      toolbarRepairFrame = 0;
    }

    for (const timeoutId of toolbarRepairTimeouts) {
      window.clearTimeout(timeoutId);
    }
    toolbarRepairTimeouts = [];
  };

  const isToolbarVisible = () => {
    if (!isAtBookmarkTop) {
      return true;
    }

    if (!toolbarStickyEl || !toolbarStickyEl.isConnected) {
      return false;
    }

    const rect = toolbarStickyEl.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const repairToolbarIfNeeded = async () => {
    toolbarRepairFrame = window.requestAnimationFrame(async () => {
      toolbarRepairFrame = 0;
      await tick();

      if (!isAtBookmarkTop || isToolbarVisible()) {
        toolbarRepairAttempts = 0;
        return;
      }

      if (toolbarRepairAttempts >= 2) {
        return;
      }

      toolbarRepairAttempts += 1;
      toolbarRenderKey += 1;
    });
  };

  onMount(() => {
    const queueRepairCheck = (delay = 0) => {
      const timeoutId = window.setTimeout(() => {
        toolbarRepairTimeouts = toolbarRepairTimeouts.filter((id) => id !== timeoutId);
        void repairToolbarIfNeeded();
      }, delay);

      toolbarRepairTimeouts = [...toolbarRepairTimeouts, timeoutId];
    };

    queueRepairCheck(0);
    queueRepairCheck(180);

    const handlePageShow = () => {
      queueRepairCheck(0);
      queueRepairCheck(180);
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("load", handlePageShow);

    return () => {
      clearToolbarRepairTimers();
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("load", handlePageShow);
    };
  });

  onDestroy(() => {
    clearToolbarRepairTimers();
  });
  const currentLocation = tradeLocationService.locationStore;
  let currentVersion = $derived($currentLocation.version);
  let versionFolders = $derived($bookmarksService.filter(
    (folder) => folder.version === currentVersion
  ));
  let displayedFolders = $derived(versionFolders.filter(
    (folder) => !!folder.archivedAt === showArchived
  ));
  let isEmptyState = $derived(!isLoading && displayedFolders.length === 0);
  let displayedFolderIndexById = $derived(new Map(
    displayedFolders.map((folder, index) => [folder.id, index])
  ));
  let validFolderIds = $derived(new Set(
    $bookmarksService.map((folder) => folder.id).filter(Boolean)
  ));
  let tutorialTargetFolderId = $derived(tutorialStep === "save-search"
    ? tutorialFolderId || displayedFolders[0]?.id || null
    : null);
  $effect(() => {
    if (validFolderIds.size === 0) {
      return;
    }

    const nextExpandedFolderIds = expandedFolderIds.filter((id) => validFolderIds.has(id));
    if (nextExpandedFolderIds.length !== expandedFolderIds.length) {
      expandedFolderIds = nextExpandedFolderIds;
    }
  });
  $effect(() => {
    if (tutorialTargetFolderId && !expandedFolderIds.includes(tutorialTargetFolderId)) {
      expandedFolderIds = [...expandedFolderIds, tutorialTargetFolderId];
    }
  });
  $effect(() => {
    if (hasLoadedExpandedState) {
      persistExpandedState(expandedFolderIds);
    }
  });

  onMount(() => {
    loadExpandedState();
  });

  $effect(() => {
    if (!scrollContainer) return;

    const observer = new ResizeObserver(() => void restoreBookmarkScroll());
    observer.observe(scrollContainer);
    const restoreTimer = window.setInterval(() => {
      void restoreBookmarkScroll().then((restored) => {
        if (restored) window.clearInterval(restoreTimer);
      });
    }, 80);
    const restoreTimeout = window.setTimeout(() => {
      window.clearInterval(restoreTimer);
      void clearBookmarkScroll();
      observer.disconnect();
    }, 3000);

    void tick().then(() => restoreBookmarkScroll());

    return () => {
      window.clearInterval(restoreTimer);
      window.clearTimeout(restoreTimeout);
      observer.disconnect();
    };
  });

  $effect(() => {
    const el = scrollContainer;
    if (!el) {
      isAtBookmarkTop = true;
      return;
    }

    const onScroll = () => {
      isAtBookmarkTop = el.scrollTop <= 0;
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  });
</script>

<div class="bookmarks-page" data-tutorial="bookmarks-panel">
  {#key toolbarRenderKey}
    <div
      class="toolbar-sticky"
      class:is-hidden={!isAtBookmarkTop}
      data-tutorial="bookmarks-toolbar"
      bind:this={toolbarStickyEl}
      aria-hidden={!isAtBookmarkTop}
    >
      <section class="toolbar-panel">
        <div class="toolbar-row">
          <div class="toolbar-actions toolbar-actions--primary">
            <button class="toolbar-button" data-tutorial="new-folder" type="button" title={translate($languageStore, "bookmarks.toolbar.newFolderTitle")} aria-label={translate($languageStore, "bookmarks.toolbar.newFolderTitle")} onclick={createFolder}>
              <span class="toolbar-icon" aria-hidden="true"><SvgIcon svg={toolbarIcons.newFolder} size={13} className="toolbar-svg" /></span>
              <span class="toolbar-label">{translate($languageStore, "bookmarks.toolbar.new")}</span>
            </button>
            <button
              class:active={isImportingText}
              class="toolbar-button"
              type="button"
              title={isImportingText ? translate($languageStore, "bookmarks.toolbar.cancelImport") : translate($languageStore, "bookmarks.toolbar.importFolder")}
              aria-label={isImportingText ? translate($languageStore, "bookmarks.toolbar.cancelImport") : translate($languageStore, "bookmarks.toolbar.importFolder")}
              onclick={() => isImportingText = !isImportingText}
            >
              <span class="toolbar-icon" aria-hidden="true">
                <SvgIcon svg={isImportingText ? toolbarIcons.cancel : toolbarIcons.import} size={13} className="toolbar-svg" />
              </span>
              <span class="toolbar-label">{isImportingText ? translate($languageStore, "bookmarks.toolbar.cancel") : translate($languageStore, "bookmarks.toolbar.import")}</span>
            </button>
          </div>

          <div class="toolbar-actions toolbar-actions--secondary">
            <button class="toolbar-button" type="button" title={translate($languageStore, "bookmarks.toolbar.collapseAll")} aria-label={translate($languageStore, "bookmarks.toolbar.collapseAll")} onclick={collapseAll}>
              <span class="toolbar-icon" aria-hidden="true"><SvgIcon svg={toolbarIcons.collapse} size={13} className="toolbar-svg" /></span>
            </button>
            <button
              class:active={showArchived}
              class="toolbar-button"
              type="button"
              title={showArchived ? translate($languageStore, "bookmarks.toolbar.showActive") : translate($languageStore, "bookmarks.toolbar.showArchived")}
              aria-label={showArchived ? translate($languageStore, "bookmarks.toolbar.showActive") : translate($languageStore, "bookmarks.toolbar.showArchived")}
              onclick={() => showArchived = !showArchived}
            >
              <span class="toolbar-icon" aria-hidden="true">
                <SvgIcon svg={showArchived ? toolbarIcons.active : toolbarIcons.archive} size={13} className="toolbar-svg" />
              </span>
            </button>
          </div>
        </div>

        {#if isImportingText}
          <div class="import-text-area">
            <div class="import-copy">
              <div class="import-title">{translate($languageStore, "bookmarks.importTitle")}</div>
              <p class="import-description">{translate($languageStore, "bookmarks.importDescription")}</p>
            </div>
            <div class="import-field">
              <textarea
              bind:value={importText}
              placeholder={translate($languageStore, "bookmarks.importPlaceholder")}
              ></textarea>
              <div class="import-hint">{translate($languageStore, "bookmarks.importHint")}</div>
            </div>
            <div class="import-actions">
              <Button label={translate($languageStore, "bookmarks.confirmImport")} theme="gold" onClick={processTextImport} />
            </div>
          </div>
        {/if}
      </section>
    </div>
  {/key}

  <LoadingContainer {isLoading}>
    <div class="folders-list">
      {#if isEmptyState}
        <EmptyState
          iconHtml={toolbarIcons.newFolder}
          eyebrow={translate($languageStore, "bookmarks.emptyEyebrow")}
          title={translate($languageStore, showArchived ? "bookmarks.emptyArchivedTitle" : "bookmarks.emptyTitle")}
          description={translate($languageStore, showArchived ? "bookmarks.emptyArchivedDescription" : "bookmarks.emptyDescription")}
          actionLabel={translate($languageStore, showArchived ? "bookmarks.emptyArchivedAction" : "bookmarks.toolbar.newFolderTitle")}
          onAction={showArchived ? () => showArchived = false : createFolder}
        />
      {:else}
        {#each displayedFolders as folder (folder.id)}
          <div class="folder-shell" animate:flip={{ duration: 180 }}>
            <BookmarkFolder 
                {folder} 
                {scrollContainer}
                isExpanded={expandedFolderIds.includes(folder.id || "")}
                isTutorialSaveTarget={tutorialStep === "save-search" && folder.id === tutorialTargetFolderId}
                startInEditMode={pendingEditFolderId === folder.id}
                isNewFolderEdit={newFolderEditId === folder.id}
                onStartInEditModeHandled={() => {
                  if (pendingEditFolderId === folder.id) pendingEditFolderId = null;
                }}
                onNewFolderEditSaved={() => confirmNewFolderEdit(folder.id)}
                onNewFolderEditCancelled={() => cancelNewFolderEdit(folder.id)}
                onToggleExpansion={toggleExpansion}
                onArchiveEvent={() => toggleArchive(folder)}
                 onDeleteEvent={() => requestFolderDelete(folder)}
                onFolderDragStart={handleFolderDragStart}
                onFolderDragEnter={handleFolderDragEnter}
                onFolderDrop={handleFolderDrop}
                onFolderDragEnd={handleFolderDragEnd}
                isFolderDragging={draggedFolderId === folder.id}
                isFolderDragOver={dragOverFolderId === folder.id}
            />
          </div>
        {/each}
      {/if}
    </div>
  </LoadingContainer>
</div>

<ConfirmDialog
  open={!!folderPendingDelete}
  title={translate($languageStore, "confirm.deleteFolderTitle")}
  message={translate($languageStore, "confirm.deleteFolderMessage", {
    title: folderPendingDelete?.title || ""
  })}
  confirmLabel={translate($languageStore, "confirm.delete")}
  cancelLabel={translate($languageStore, "confirm.cancel")}
  onCancel={cancelFolderDelete}
  onConfirm={() => {
    if (folderPendingDelete) {
      void deleteFolder(folderPendingDelete)
    }
  }} />

<style>
.bookmarks-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100%;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  container-type: inline-size;
}

.toolbar-panel {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 12px;
  background: #120f0d;
  border: 1px solid rgba(163, 141, 109, 0.1);
  border-radius: 4px;
  margin: 0 4px;
}

.toolbar-sticky {
  flex: 0 0 auto;
  min-width: 0;
  isolation: isolate;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.toolbar-sticky.is-hidden {
  display: none;
}

.toolbar-panel {
  gap: 10px;
  padding: 10px 12px;
  background: #15110e;
  border-color: rgba(163, 141, 109, 0.14);
  min-width: 0;
  box-shadow: inset 0 1px 0 rgba(238, 238, 238, 0.03);
}

.toolbar-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  align-items: start;
  min-width: 0;
}

.bookmarks-page :global(.loading-container) {
  flex: 1 1 auto;
  min-height: 0;
}

.toolbar-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  flex: 1 1 0;
  min-width: 0;
}

.toolbar-actions--secondary {
  grid-template-columns: repeat(2, 34px);
  flex: 0 0 auto;
  opacity: 0.88;
}

.toolbar-button {
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid rgba(163, 141, 109, 0.22);
  border-radius: 4px;
  background: rgba(5, 5, 5, 0.34);
  color: #d7a75f;
  font-family: "FontinSmallcaps", serif;
  font-size: calc(10px * var(--bt-text-scale, 1));
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.toolbar-button:hover {
  border-color: rgba(163, 141, 109, 0.34);
  background: rgba(42, 34, 24, 0.9);
  transform: translateY(-1px);
  box-shadow: inset 0 1px 0 rgba(255, 232, 187, 0.04);
}
.toolbar-button.active {
  border-color: rgba(163, 141, 109, 0.38);
  background: rgba(54, 42, 28, 0.96);
  color: #e2b56e;
}

.toolbar-actions--secondary .toolbar-button {
  width: 34px;
  padding: 0;
  min-height: 34px;
  border-color: rgba(163, 141, 109, 0.14);
  background: rgba(5, 5, 5, 0.22);
  color: rgba(215, 167, 95, 0.84);
}
.toolbar-actions--secondary .toolbar-button:hover {
  border-color: rgba(163, 141, 109, 0.24);
  background: rgba(33, 27, 20, 0.82);
  box-shadow: inset 0 1px 0 rgba(255, 232, 187, 0.02);
}
.toolbar-actions--secondary .toolbar-button.active {
  border-color: rgba(163, 141, 109, 0.26);
  background: rgba(47, 38, 28, 0.88);
  color: #ddb26b;
}

.toolbar-icon {
  line-height: 1;
  opacity: 0.82;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  overflow: visible;
}

.toolbar-icon :global(.toolbar-svg) {
  width: 14px;
  height: 14px;
  min-width: 14px;
  min-height: 14px;
  stroke-width: 1.65;
  display: block;
  overflow: visible;
}

.toolbar-label {
  line-height: 1;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  min-height: 14px;
}

@container (max-width: 400px) {
  .toolbar-actions--secondary .toolbar-button {
    gap: 0;
  }
}
@media (min-width: 520px) {
  .toolbar-actions--primary {
    flex: 1 1 0;
  }
}
.folders-list {
  flex: 1;
  margin: 2px 0;
  width: 100%;
  min-width: 0;
}

.import-text-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(163, 141, 109, 0.1);
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.04), rgba(163, 141, 109, 0.01));
  border-radius: 6px;
}

.import-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.import-title {
  font-family: "FontinSmallcaps", serif;
  font-size: calc(11px * var(--bt-text-scale, 1));
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a38d6d;
}

.import-description,
.import-hint {
  margin: 0;
  font-size: calc(11px * var(--bt-text-scale, 1));
  line-height: 1.4;
}

.import-description {
  color: rgba(238, 238, 238, 0.76);
}

.import-hint {
  color: rgba(196, 177, 140, 0.62);
}

.import-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.import-field textarea {
  width: 100%;
  min-height: 112px;
  background: rgba(5, 5, 5, 0.38);
  border: 1px solid rgba(163, 141, 109, 0.18);
  border-radius: 6px;
  color: #eeeeee;
  font-family: monospace;
  font-size: calc(11px * var(--bt-text-scale, 1));
  line-height: 1.45;
  padding: 10px;
  resize: vertical;
}
.import-field textarea:focus-visible {
  border-color: #a38d6d;
  box-shadow: 0 0 0 1px rgba(163, 141, 109, 0.24), 0 0 0 3px rgba(163, 141, 109, 0.1);
}

.import-actions {
  display: flex;
  justify-content: flex-end;
}

:global(.flex-1) {
  flex: 1;
}
</style>
