<script lang="ts">
  import { flip } from "svelte/animate";
  import { onMount } from "svelte";
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
  import LoadingContainer from "../LoadingContainer.svelte";

  const EXPANDED_FOLDERS_STORAGE_KEY = "bookmark-folders-expanded";

  let expandedFolderIds: string[] = [];
  let isLoading = false;
  let showArchived = false;
  let loadedExpandedStateKey: string | null = null;
  
  let isImportingText = false;
  let importText = "";
  let draggedFolderId: string | null = null;
  let dragOverFolderId: string | null = null;

  $: currentLocation = tradeLocationService.locationStore;
  $: displayedFolders = $bookmarksService.filter((folder) => {
    const matchesArchive = !!folder.archivedAt === showArchived;
    const matchesVersion = folder.version === $currentLocation.version;
    return matchesArchive && matchesVersion;
  });
  $: expandedFoldersStorageKey = `${EXPANDED_FOLDERS_STORAGE_KEY}-${$currentLocation.version}`;
  $: validFolderIds = new Set($bookmarksService.map((folder) => folder.id).filter(Boolean));
  $: {
    const nextExpandedFolderIds = expandedFolderIds.filter((id) => validFolderIds.has(id));
    if (nextExpandedFolderIds.length !== expandedFolderIds.length) {
      expandedFolderIds = nextExpandedFolderIds;
    }
  }
  $: if (expandedFoldersStorageKey && loadedExpandedStateKey !== expandedFoldersStorageKey) {
    loadExpandedState(expandedFoldersStorageKey);
  }
  $: if (loadedExpandedStateKey === expandedFoldersStorageKey) {
    persistExpandedState(expandedFoldersStorageKey, expandedFolderIds);
  }

  onMount(async () => {
    tradeLocationService.startPolling();
  });

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
      version: $currentLocation.version,
      archivedAt: null
    };
    await bookmarksService.persistFolder(newFolder);
    flashMessages.success(translate($languageStore, "bookmarks.folderCreated"));
  };

  const toggleArchive = async (folder: BookmarksFolderStruct) => {
    await bookmarksService.toggleFolderArchive(folder);
  };

  const deleteFolder = async (folder: BookmarksFolderStruct) => {
    if (!folder.id) return;
    await bookmarksService.deleteFolder(folder.id);
    flashMessages.success(translate($languageStore, "bookmarks.folderDeleted"));
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

    const targetIndex = displayedFolders.findIndex((folder) => folder.id === folderId);
    if (targetIndex === -1) {
      draggedFolderId = null;
      dragOverFolderId = null;
      return;
    }

    await bookmarksService.moveFolder(draggedFolderId, targetIndex, {
      version: $currentLocation.version,
      archived: showArchived
    });

    draggedFolderId = null;
    dragOverFolderId = null;
  };

  const handleFolderDragEnd = () => {
    draggedFolderId = null;
    dragOverFolderId = null;
  };

  const exportToFile = async () => {
      const dataString = await bookmarksService.generateBackupDataString();
      const blob = new Blob([dataString], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poe-trade-plus-backup-${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      flashMessages.success(translate($languageStore, "bookmarks.exported"));
  };

  const restoreFromFile = (event: Event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
          const dataString = e.target?.result as string;
          const success = await bookmarksService.restoreFromDataString(dataString);
          if (success) {
              flashMessages.success(translate($languageStore, "bookmarks.restored"));
          } else {
              flashMessages.alert(translate($languageStore, "bookmarks.restoreFailed"));
          }
          input.value = "";
      };
      reader.readAsText(file);
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
</script>

<div class="bookmarks-page">
  <section class="toolbar-panel">
    <div class="toolbar-row">
      <div class="toolbar-actions">
        <button class="toolbar-button" type="button" title={translate($languageStore, "bookmarks.toolbar.newFolderTitle")} aria-label={translate($languageStore, "bookmarks.toolbar.newFolderTitle")} on:click={createFolder}>
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
        <textarea 
          bind:value={importText} 
          placeholder={translate($languageStore, "bookmarks.importPlaceholder")}
          autofocus
        ></textarea>
        <div class="import-actions">
          <Button label={translate($languageStore, "bookmarks.confirmImport")} theme="gold" onClick={processTextImport} />
        </div>
      </div>
    {/if}
  </section>

  <LoadingContainer {isLoading}>
    <div class="folders-list">
      {#each displayedFolders as folder (folder.id)}
        <div class="folder-shell" animate:flip={{ duration: 180 }}>
          <BookmarkFolder 
              {folder} 
              {expandedFolderIds} 
              onToggleExpansion={toggleExpansion}
              onArchiveEvent={() => toggleArchive(folder)}
              onDeleteEvent={() => deleteFolder(folder)}
              onFolderDragStart={handleFolderDragStart}
              onFolderDragEnter={handleFolderDragEnter}
              onFolderDrop={handleFolderDrop}
              onFolderDragEnd={handleFolderDragEnd}
              isFolderDragging={draggedFolderId === folder.id}
              isFolderDragOver={dragOverFolderId === folder.id}
          />
        </div>
      {/each}
    </div>
  </LoadingContainer>

  <section class="action-section backup-section">
    <div class="section-heading">{translate($languageStore, "bookmarks.backupTitle")}</div>
    <div class="button-row backup-row">
        <Button label={translate($languageStore, "bookmarks.saveFile")} theme="gold" iconHtml={toolbarIcons.import} onClick={exportToFile} class="flex-1" />
        <Button label={translate($languageStore, "bookmarks.restoreFile")} theme="gold" iconHtml={toolbarIcons.active} onFileChange={restoreFromFile} fileAccept=".txt" class="flex-1" />
    </div>
  </section>
</div>

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
    padding: 12px;
    background: linear-gradient(180deg, rgba($gold, 0.05), transparent);
    border: 1px solid rgba($gold, 0.1);
    border-radius: 4px;
    margin: 0 4px;
  }

  .toolbar-panel {
    position: sticky;
    top: 0;
    z-index: 3;
    gap: 10px;
    padding: 10px 12px;
    background:
      linear-gradient(180deg, rgba($gold, 0.08), rgba($gold, 0.02)),
      rgba($black, 0.5);
    border-color: rgba($gold, 0.14);
    backdrop-filter: blur(8px);
  }

  .backup-section {
    margin-top: auto;
    margin-bottom: 0;
    margin-left: 0;
    margin-right: 0;
    padding: 10px 15px;
    background-color: rgba($black, 0.4);
    border-top: 1px solid rgba($gold, 0.1);
    border-bottom: none;
    border-left: none;
    border-right: none;
    border-radius: 0;
  }

  .toolbar-row {
    display: block;
  }

  .toolbar-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
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
      display: block;
    }

    .toolbar-actions {
      grid-template-columns: repeat(4, minmax(0, 1fr));
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

  .backup-row {
      :global(button) {
          letter-spacing: 0.05em;
      }

      :global(.icon),
      :global(.button-icon),
      :global(.icon-slot),
      :global([class*="icon"]) {
          opacity: 0.68;
          transform: scale(0.88);
      }
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

  .folder-shell {
    will-change: transform;
  }

  .import-text-area {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba($gold, 0.1);

      textarea {
          width: 100%;
          height: 100px;
          background: rgba($black, 0.3);
          border: 1px solid rgba($gold, 0.2);
          border-radius: 4px;
          color: $white;
          font-family: monospace;
          font-size: 11px;
          padding: 8px;
          resize: vertical;
          outline: none;

          &:focus {
              border-color: $gold;
           }
       }
   }

  .import-actions {
      display: flex;
      justify-content: flex-end;
  }

  :global(.flex-1) { flex: 1; }
</style>
