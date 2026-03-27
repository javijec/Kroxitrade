<script lang="ts">
  import { onMount } from "svelte";
  import archiveIcon from "data-text:lucide-static/icons/archive.svg";
  import archiveRestoreIcon from "data-text:lucide-static/icons/archive-restore.svg";
  import chevronsUpIcon from "data-text:lucide-static/icons/chevrons-up.svg";
  import downloadIcon from "data-text:lucide-static/icons/download.svg";
  import folderPlusIcon from "data-text:lucide-static/icons/folder-plus.svg";
  import xIcon from "data-text:lucide-static/icons/x.svg";
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
      title: "New Folder",
      icon: null,
      version: $currentLocation.version,
      archivedAt: null
    };
    await bookmarksService.persistFolder(newFolder);
    flashMessages.success("Folder created!");
  };

  const toggleArchive = async (folder: BookmarksFolderStruct) => {
    await bookmarksService.toggleFolderArchive(folder);
  };

  const deleteFolder = async (folder: BookmarksFolderStruct) => {
    if (!folder.id) return;
    await bookmarksService.deleteFolder(folder.id);
    flashMessages.success("Folder deleted!");
  };

  const collapseAll = () => {
      expandedFolderIds = [];
  };

  const exportToFile = async () => {
      const dataString = await bookmarksService.generateBackupDataString();
      const blob = new Blob([dataString], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kroxitrade-backup-${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      flashMessages.success("Backup exported!");
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
              flashMessages.success("Backup restored!");
          } else {
              flashMessages.alert("Failed to restore backup.");
          }
          input.value = "";
      };
      reader.readAsText(file);
  };

  const processTextImport = async () => {
      const serialized = importText.trim();
      if (!serialized) {
          flashMessages.alert("Please paste the folder data first.");
          return;
      }

      const deserialized = bookmarksService.deserializeFolder(serialized);
      if (!deserialized) {
          flashMessages.alert("Invalid folder data. Please check the string.");
          return;
      }

      const [folder, trades] = deserialized;
      const folderId = await bookmarksService.persistFolder(folder);
      await bookmarksService.persistTrades(trades, folderId);
      
      flashMessages.success(`Imported "${folder.title}"!`);
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
</script>

<div class="bookmarks-page">
  <section class="toolbar-panel">
    <div class="toolbar-row">
      <div class="toolbar-actions">
        <button class="toolbar-button" type="button" title="New Folder" aria-label="New Folder" on:click={createFolder}>
          <span class="toolbar-icon" aria-hidden="true">{@html toolbarIcons.newFolder}</span>
          <span class="toolbar-label">New</span>
        </button>
        <button
          class:active={isImportingText}
          class="toolbar-button"
          type="button"
          title={isImportingText ? "Cancel Import" : "Import Folder"}
          aria-label={isImportingText ? "Cancel Import" : "Import Folder"}
          on:click={() => isImportingText = !isImportingText}
        >
          <span class="toolbar-icon" aria-hidden="true">
            {@html isImportingText ? toolbarIcons.cancel : toolbarIcons.import}
          </span>
          <span class="toolbar-label">{isImportingText ? "Cancel" : "Import"}</span>
        </button>
        <button class="toolbar-button" type="button" title="Collapse All" aria-label="Collapse All" on:click={collapseAll}>
          <span class="toolbar-icon" aria-hidden="true">{@html toolbarIcons.collapse}</span>
          <span class="toolbar-label">Collapse</span>
        </button>
        <button
          class:active={showArchived}
          class="toolbar-button"
          type="button"
          title={showArchived ? "Show Active" : "Show Archived"}
          aria-label={showArchived ? "Show Active" : "Show Archived"}
          on:click={() => showArchived = !showArchived}
        >
          <span class="toolbar-icon" aria-hidden="true">
            {@html showArchived ? toolbarIcons.active : toolbarIcons.archive}
          </span>
          <span class="toolbar-label">{showArchived ? "Active" : "Archive"}</span>
        </button>
      </div>
    </div>

    {#if isImportingText}
      <div class="import-text-area">
        <textarea 
          bind:value={importText} 
          placeholder="Paste folder text here..."
          autofocus
        ></textarea>
        <div class="import-actions">
          <Button label="CONFIRM IMPORT" theme="gold" onClick={processTextImport} />
        </div>
      </div>
    {/if}
  </section>

  <LoadingContainer {isLoading}>
    <div class="folders-list">
      {#each displayedFolders as folder (folder.id)}
        <BookmarkFolder 
            {folder} 
            {expandedFolderIds} 
            onToggleExpansion={toggleExpansion} 
            onArchiveEvent={() => toggleArchive(folder)}
            onDeleteEvent={() => deleteFolder(folder)}
        />
      {/each}
    </div>
  </LoadingContainer>

  <section class="action-section backup-section">
    <div class="section-heading">Backup & Restore</div>
    <div class="button-row backup-row">
        <Button label="SAVE FILE" theme="gold" icon="💾" onClick={exportToFile} class="flex-1" />
        <Button label="RESTORE FROM FILE" theme="gold" icon="📂" onFileChange={restoreFromFile} fileAccept=".txt" class="flex-1" />
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
  }

  .toolbar-icon svg {
    width: 14px;
    height: 14px;
    stroke-width: 1.85;
  }

  .toolbar-label {
    line-height: 1;
    white-space: nowrap;
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
