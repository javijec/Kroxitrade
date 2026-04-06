<script lang="ts">
  import { flip } from "svelte/animate";
  import { onDestroy, onMount, tick } from "svelte";
  import archiveIcon from "data-text:lucide-static/icons/archive.svg";
  import archiveRestoreIcon from "data-text:lucide-static/icons/archive-restore.svg";
  import chevronsUpIcon from "data-text:lucide-static/icons/chevrons-up.svg";
  import downloadIcon from "data-text:lucide-static/icons/download.svg";
  import folderPlusIcon from "data-text:lucide-static/icons/folder-plus.svg";
  import xIcon from "data-text:lucide-static/icons/x.svg";
  import { languageStore, translate } from "../../lib/services/i18n";
  import { bookmarksService } from "../../lib/services/bookmarks";
  import { tradeLocationService } from "../../lib/services/trade-location";
  import { flashMessages } from "../../lib/services/flash";
  import { storageService } from "../../lib/services/storage";
  import type { BookmarksFolderStruct } from "../../lib/types/bookmarks";

  import BookmarkFolder from "../BookmarkFolder.svelte";
  import Button from "../Button.svelte";
  import ConfirmDialog from "../ConfirmDialog.svelte";
  import LoadingContainer from "../LoadingContainer.svelte";

  const EXPANDED_FOLDERS_STORAGE_KEY = "bookmark-folders-expanded";

  export let tutorialStep:
    | "create-folder"
    | "save-search"
    | "history"
    | "settings-tutorial"
    | "settings-sidebar"
    | "settings-language"
    | "settings-equivalent"
    | "settings-bulk"
    | "settings-history"
    | "settings-filters"
    | "settings-bookmarks"
    | null = null;
  export let tutorialFolderId: string | null = null;

  let expandedFolderIds: string[] = [];
  let isLoading = false;
  let showArchived = false;
  let loadedExpandedStateKey: string | null = null;
  
  let isImportingText = false;
  let importText = "";
  let draggedFolderId: string | null = null;
  let dragOverFolderId: string | null = null;
  let folderPendingDelete: BookmarksFolderStruct | null = null;
  let toolbarStickyEl: HTMLDivElement | null = null;
  let toolbarRenderKey = 0;
  let toolbarRepairFrame = 0;
  let toolbarRepairTimeouts: number[] = [];
  let toolbarRepairAttempts = 0;

  $: currentLocation = tradeLocationService.locationStore;
  $: currentVersion = $currentLocation.version;
  $: versionFolders = $bookmarksService.filter(
    (folder) => folder.version === currentVersion
  );
  $: displayedFolders = versionFolders.filter(
    (folder) => !!folder.archivedAt === showArchived
  );
  $: isEmptyState = !isLoading && displayedFolders.length === 0;
  $: displayedFolderIndexById = new Map(
    displayedFolders.map((folder, index) => [folder.id, index])
  );
  $: expandedFoldersStorageKey = `${EXPANDED_FOLDERS_STORAGE_KEY}-${currentVersion}`;
  $: validFolderIds = new Set(
    versionFolders.map((folder) => folder.id).filter(Boolean)
  );
  $: tutorialTargetFolderId = tutorialStep === "save-search"
    ? tutorialFolderId || displayedFolders[0]?.id || null
    : null;
  $: {
    const nextExpandedFolderIds = expandedFolderIds.filter((id) => validFolderIds.has(id));
    if (nextExpandedFolderIds.length !== expandedFolderIds.length) {
      expandedFolderIds = nextExpandedFolderIds;
    }
  }
  $: if (tutorialTargetFolderId && !expandedFolderIds.includes(tutorialTargetFolderId)) {
    expandedFolderIds = [...expandedFolderIds, tutorialTargetFolderId];
  }
  $: if (expandedFoldersStorageKey && loadedExpandedStateKey !== expandedFoldersStorageKey) {
    loadExpandedState(expandedFoldersStorageKey);
  }
  $: if (loadedExpandedStateKey === expandedFoldersStorageKey) {
    persistExpandedState(expandedFoldersStorageKey, expandedFolderIds);
  }

  const loadExpandedState = (storageKey: string) => {
    const raw = storageService.getLocalValue(storageKey);

    try {
      const parsed = raw ? JSON.parse(raw) : [];
      expandedFolderIds = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
      expandedFolderIds = [];
    }

    loadedExpandedStateKey = storageKey;
  };

  const persistExpandedState = (storageKey: string, folderIds: string[]) => {
    storageService.setLocalValue(storageKey, JSON.stringify(folderIds));
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
    flashMessages.success(translate($languageStore, "bookmarks.folderCreated"));
  };

  const toggleArchive = async (folder: BookmarksFolderStruct) => {
    await bookmarksService.toggleFolderArchive(folder);
  };

  const deleteFolder = async (folder: BookmarksFolderStruct) => {
    if (!folder.id) return;
    await bookmarksService.deleteFolder(folder.id);
    folderPendingDelete = null;
    flashMessages.success(translate($languageStore, "bookmarks.folderDeleted"));
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

  const handleFolderDragStart = (event: DragEvent, folderId: string) => {
    draggedFolderId = folderId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", folderId);
    }
  };

  const handleFolderDragEnter = (event: DragEvent, folderId: string) => {
    event.preventDefault();
    if (draggedFolderId && draggedFolderId !== folderId) {
      dragOverFolderId = folderId;
    }
  };

  const handleFolderDrop = async (event: DragEvent, folderId: string) => {
    event.preventDefault();
    if (!draggedFolderId || draggedFolderId === folderId) {
      draggedFolderId = null;
      dragOverFolderId = null;
      return;
    }

    const targetIndex = displayedFolderIndexById.get(folderId) ?? -1;
    if (targetIndex === -1) {
      draggedFolderId = null;
      dragOverFolderId = null;
      return;
    }

    await bookmarksService.moveFolder(draggedFolderId, targetIndex, {
      version: currentVersion,
      archived: showArchived
    });

    draggedFolderId = null;
    dragOverFolderId = null;
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

  const normalizeToolbarIcon = (svg: string) =>
    svg
      .replace(/<svg\b([^>]*)>/, (_match, attrs) => {
        const nextAttrs = attrs
          .replace(/\sclass="[^"]*"/g, "")
          .replace(/\swidth="[^"]*"/g, "")
          .replace(/\sheight="[^"]*"/g, "")
          .replace(/\sviewBox="[^"]*"/g, "")
          .trim();

        return `<svg ${nextAttrs} viewBox="-2 -2 28 28" class="toolbar-svg">`;
      });

  const toolbarIcons = {
    newFolder: normalizeToolbarIcon(folderPlusIcon),
    import: normalizeToolbarIcon(downloadIcon),
    cancel: normalizeToolbarIcon(xIcon),
    collapse: normalizeToolbarIcon(chevronsUpIcon),
    archive: normalizeToolbarIcon(archiveIcon),
    active: normalizeToolbarIcon(archiveRestoreIcon)
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

      if (isToolbarVisible()) {
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
</script>

<div class="bookmarks-page" data-tutorial="bookmarks-panel">
  {#key toolbarRenderKey}
    <div class="toolbar-sticky" data-tutorial="bookmarks-toolbar" bind:this={toolbarStickyEl}>
      <section class="toolbar-panel">
        <div class="toolbar-row">
          <div class="toolbar-actions toolbar-actions--primary">
            <button class="toolbar-button" data-tutorial="new-folder" type="button" title={translate($languageStore, "bookmarks.toolbar.newFolderTitle")} aria-label={translate($languageStore, "bookmarks.toolbar.newFolderTitle")} on:click={createFolder}>
              <span class="toolbar-icon" aria-hidden="true">{@html toolbarIcons.newFolder}</span>
              <span class="toolbar-label">{translate($languageStore, "bookmarks.toolbar.new")}</span>
            </button>
            <button
              class:active={isImportingText}
              class="toolbar-button"
              type="button"
              title={isImportingText ? translate($languageStore, "bookmarks.toolbar.cancelImport") : translate($languageStore, "bookmarks.toolbar.importFolder")}
              aria-label={isImportingText ? translate($languageStore, "bookmarks.toolbar.cancelImport") : translate($languageStore, "bookmarks.toolbar.importFolder")}
              on:click={() => isImportingText = !isImportingText}
            >
              <span class="toolbar-icon" aria-hidden="true">
                {@html isImportingText ? toolbarIcons.cancel : toolbarIcons.import}
              </span>
              <span class="toolbar-label">{isImportingText ? translate($languageStore, "bookmarks.toolbar.cancel") : translate($languageStore, "bookmarks.toolbar.import")}</span>
            </button>
          </div>

          <div class="toolbar-actions toolbar-actions--secondary">
            <button class="toolbar-button" type="button" title={translate($languageStore, "bookmarks.toolbar.collapseAll")} aria-label={translate($languageStore, "bookmarks.toolbar.collapseAll")} on:click={collapseAll}>
              <span class="toolbar-icon" aria-hidden="true">{@html toolbarIcons.collapse}</span>
              <span class="toolbar-label">{translate($languageStore, "bookmarks.toolbar.collapse")}</span>
            </button>
            <button
              class:active={showArchived}
              class="toolbar-button"
              type="button"
              title={showArchived ? translate($languageStore, "bookmarks.toolbar.showActive") : translate($languageStore, "bookmarks.toolbar.showArchived")}
              aria-label={showArchived ? translate($languageStore, "bookmarks.toolbar.showActive") : translate($languageStore, "bookmarks.toolbar.showArchived")}
              on:click={() => showArchived = !showArchived}
            >
              <span class="toolbar-icon" aria-hidden="true">
                {@html showArchived ? toolbarIcons.active : toolbarIcons.archive}
              </span>
              <span class="toolbar-label">{showArchived ? translate($languageStore, "bookmarks.toolbar.active") : translate($languageStore, "bookmarks.toolbar.archive")}</span>
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
        <section class="empty-state">
          <div class="empty-state-eyebrow">{translate($languageStore, "bookmarks.emptyEyebrow")}</div>
          <h3 class="empty-state-title">
            {translate($languageStore, showArchived ? "bookmarks.emptyArchivedTitle" : "bookmarks.emptyTitle")}
          </h3>
          <p class="empty-state-description">
            {translate($languageStore, showArchived ? "bookmarks.emptyArchivedDescription" : "bookmarks.emptyDescription")}
          </p>
          <div class="empty-state-actions">
            {#if showArchived}
              <Button
                label={translate($languageStore, "bookmarks.emptyArchivedAction")}
                theme="gold"
                onClick={() => showArchived = false} />
            {:else}
              <Button
                label={translate($languageStore, "bookmarks.toolbar.newFolderTitle")}
                theme="gold"
                onClick={createFolder} />
            {/if}
          </div>
        </section>
      {:else}
        {#each displayedFolders as folder (folder.id)}
          <div class="folder-shell" animate:flip={{ duration: 180 }}>
            <BookmarkFolder 
                {folder} 
                isExpanded={expandedFolderIds.includes(folder.id || "")}
                isTutorialSaveTarget={tutorialStep === "save-search" && folder.id === tutorialTargetFolderId}
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

<style lang="scss">
  @use "../../lib/styles/variables" as *;

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

  .toolbar-panel,
  .action-section {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    padding: 12px;
    background: linear-gradient(180deg, rgba($gold, 0.05), transparent);
    border: 1px solid rgba($gold, 0.1);
    border-radius: 4px;
    margin: 0 4px;
  }

  .toolbar-sticky {
    position: sticky;
    top: 0;
    z-index: 3;
    flex: 0 0 auto;
    min-width: 0;
    isolation: isolate;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  .toolbar-panel {
    gap: 10px;
    padding: 10px 12px;
    background:
      linear-gradient(180deg, rgba($gold, 0.08), rgba($gold, 0.02)),
      rgba($black, 0.5);
    border-color: rgba($gold, 0.14);
    min-width: 0;
    box-shadow: inset 0 1px 0 rgba($white, 0.03);
  }

  .toolbar-row {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
    gap: 6px;
    align-items: start;
  }

  .bookmarks-page :global(.loading-container) {
    flex: 1 1 auto;
    min-height: 0;
  }

  .toolbar-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .toolbar-actions--secondary {
    opacity: 0.88;
  }

  .toolbar-button {
    min-height: 36px;
    padding: 0 10px;
    border: 1px solid rgba($gold, 0.22);
    border-radius: 4px;
    background: rgba($black, 0.34);
    color: #d7a75f;
    font-family: $primary-font;
    font-size: 10px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      transform 0.15s ease,
      box-shadow 0.15s ease;

    &:hover {
      border-color: rgba($gold, 0.34);
      background: rgba(42, 34, 24, 0.9);
      transform: translateY(-1px);
      box-shadow: inset 0 1px 0 rgba(255, 232, 187, 0.04);
    }

    &.active {
      border-color: rgba($gold, 0.38);
      background: rgba(54, 42, 28, 0.96);
      color: #e2b56e;
    }
  }

  .toolbar-actions--secondary .toolbar-button {
    min-height: 34px;
    border-color: rgba($gold, 0.14);
    background: rgba($black, 0.22);
    color: rgba(215, 167, 95, 0.84);

    &:hover {
      border-color: rgba($gold, 0.24);
      background: rgba(33, 27, 20, 0.82);
      box-shadow: inset 0 1px 0 rgba(255, 232, 187, 0.02);
    }

    &.active {
      border-color: rgba($gold, 0.26);
      background: rgba(47, 38, 28, 0.88);
      color: #ddb26b;
    }
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

  @container (max-width: 359px) {
    .toolbar-icon {
      display: none;
    }

    .toolbar-button {
      gap: 0;
      padding: 0 8px;
    }
  }

  @media (min-width: 520px) {
    .toolbar-row {
      grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
    }
  }

  @container (max-width: 359px) {
    .toolbar-row {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .section-heading {
    font-family: $primary-font;
    font-size: 10px;
    letter-spacing: 0.1em;
    color: $gold;
    text-transform: uppercase;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .button-row {
      display: flex;
      gap: 6px;
      width: 100%;
      min-width: 0;
  }

  .view-controls {
      display: flex;
      gap: 6px;
      width: 100%;
      min-width: 0;
  }

  .folders-list {
    flex: 1;
    margin: 2px 0;
    width: 100%;
    min-width: 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin: 4px;
    padding: 16px 14px;
    border: 1px dashed rgba($gold, 0.18);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba($gold, 0.05), rgba($gold, 0.015)),
      rgba($black, 0.28);
  }

  .empty-state-eyebrow {
    font-family: $primary-font;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba($gold-alt, 0.82);
  }

  .empty-state-title {
    margin: 0;
    font-family: "Fontin", serif;
    font-size: 18px;
    line-height: 1.15;
    color: rgba($white, 0.96);
  }

  .empty-state-description {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: rgba($white, 0.74);
  }

  .empty-state-actions {
    display: flex;
    padding-top: 2px;
  }


  .import-text-area {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 10px;
      padding-top: 12px;
      border-top: 1px solid rgba($gold, 0.1);
      background: linear-gradient(180deg, rgba($gold, 0.04), rgba($gold, 0.01));
      border-radius: 6px;
  }

  .import-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
  }

  .import-title {
      font-family: $primary-font;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: $gold;
  }

  .import-description,
  .import-hint {
      margin: 0;
      font-size: 11px;
      line-height: 1.4;
  }

  .import-description {
      color: rgba($white, 0.76);
  }

  .import-hint {
      color: rgba($gold-alt, 0.62);
  }

  .import-field {
      display: flex;
      flex-direction: column;
      gap: 6px;

      textarea {
          width: 100%;
          min-height: 112px;
          background: rgba($black, 0.38);
          border: 1px solid rgba($gold, 0.18);
          border-radius: 6px;
          color: $white;
          font-family: monospace;
          font-size: 11px;
          line-height: 1.45;
          padding: 10px;
          resize: vertical;
          &:focus-visible {
              border-color: $gold;
              box-shadow:
                0 0 0 1px rgba($gold, 0.24),
                0 0 0 3px rgba($gold, 0.1);
           }
       }
   }

  .import-actions {
      display: flex;
      justify-content: flex-end;
  }

  :global(.flex-1) { flex: 1; }
</style>
