<script lang="ts">
  import { onMount } from "svelte";
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

  $: currentLocation = tradeLocationService.locationStore;
  $: displayedFolders = $bookmarksService.filter(f => !!f.archivedAt === showArchived && f.version === $currentLocation.version);
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

  const importFolder = (event: Event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
          const serialized = (e.target?.result as string).trim();
          const deserialized = bookmarksService.deserializeFolder(serialized);
          if (!deserialized) {
              flashMessages.alert("Invalid folder data.");
              return;
          }
          const [folder, trades] = deserialized;
          const folderId = await bookmarksService.persistFolder(folder);
          await bookmarksService.persistTrades(trades, folderId);
          flashMessages.success(`Imported "${folder.title}"!`);
          input.value = "";
      };
      reader.readAsText(file);
  };
</script>

<div class="bookmarks-page">
  <section class="action-section primary-actions">
    <div class="section-heading">Folders</div>
    <div class="button-row">
        <Button label="NEW FOLDER" theme="gold" icon="📁" onClick={createFolder} class="flex-1" />
        <Button label="IMPORT FOLDER" theme="gold" icon="↓" onFileChange={importFolder} fileAccept=".txt" class="flex-1" />
    </div>
  </section>

  <section class="action-section">
    <div class="section-heading">Backup</div>
    <div class="button-row">
        <Button label="SAVE FILE" theme="blue" icon="💾" onClick={exportToFile} class="flex-1" />
        <Button label="RESTORE FROM FILE" theme="blue" icon="📂" onFileChange={restoreFromFile} fileAccept=".txt" class="flex-1" />
    </div>
  </section>

  <div class="view-controls">
    <Button label="COLLAPSE ALL" theme="gold" onClick={collapseAll} class="flex-1" />
    <Button 
        label={showArchived ? "SHOW ACTIVE" : "SHOW ARCHIVED"} 
        theme="gold" 
        onClick={() => showArchived = !showArchived} 
        class="flex-1"
    />
  </div>

  <LoadingContainer {isLoading}>
    <div class="folders-list">
      {#each displayedFolders as folder (folder.id)}
        <BookmarkFolder 
            {folder} 
            {expandedFolderIds} 
            onToggleExpansion={toggleExpansion} 
            onEdit={() => {}}
            onArchiveEvent={() => toggleArchive(folder)}
            onDeleteEvent={() => deleteFolder(folder)}
        />
      {/each}
    </div>
  </LoadingContainer>
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

  .action-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    background-color: rgba($white, 0.02);
    border: 1px solid rgba($white, 0.08);
  }

  .section-heading {
    font-family: $primary-font;
    font-size: 12px;
    color: rgba($white, 0.72);
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

  :global(.flex-1) { flex: 1; }
</style>
