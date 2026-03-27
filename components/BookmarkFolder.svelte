<script lang="ts">
  import archiveIcon from "data-text:lucide-static/icons/archive.svg";
  import archiveRestoreIcon from "data-text:lucide-static/icons/archive-restore.svg";
  import checkIcon from "data-text:lucide-static/icons/check.svg";
  import copyIcon from "data-text:lucide-static/icons/copy.svg";
  import editIcon from "data-text:lucide-static/icons/pencil.svg";
  import replaceIcon from "data-text:lucide-static/icons/refresh-cw.svg";
  import trashIcon from "data-text:lucide-static/icons/trash-2.svg";
  import uploadIcon from "data-text:lucide-static/icons/upload.svg";
  import type { BookmarksFolderStruct, BookmarksTradeStruct } from "../lib/types/bookmarks";
  import { bookmarksService } from "../lib/services/bookmarks";
  import { getActiveTradeTabTitle, openUrlInActiveTab } from "../lib/services/active-trade-tab";
  import { tradeLocationService } from "../lib/services/trade-location";
  import { flashMessages } from "../lib/services/flash";
  import { getTradeUrl } from "../lib/utilities/trade-url";
  import { copyToClipboard } from "../lib/utilities/copy-to-clipboard";
  
  import Button from "./Button.svelte";
  import LoadingContainer from "./LoadingContainer.svelte";

  export let folder: BookmarksFolderStruct;
  export let expandedFolderIds: string[];
  export let onToggleExpansion: (id: string) => void;
  export let onArchiveEvent: () => void;
  export let onDeleteEvent: () => void;

  let trades: BookmarksTradeStruct[] = [];
  let isLoading = false;
  let hasLoadedTrades = false;

  $: isExpanded = expandedFolderIds.includes(folder.id || "");
  $: isArchived = !!folder.archivedAt;
  $: if (!isExpanded) {
    hasLoadedTrades = false;
  }
  $: if (isExpanded && !hasLoadedTrades && !isLoading) {
    void loadTrades();
  }
  const loadTrades = async () => {
    if (!folder.id) return;
    isLoading = true;
    trades = await bookmarksService.fetchTradesByFolderId(folder.id);
    hasLoadedTrades = true;
    isLoading = false;
  };

  const toggleTrade = async (trade: BookmarksTradeStruct) => {
    if (!folder.id) return;
    await bookmarksService.toggleTradeCompletion(trade, folder.id);
    await loadTrades();
  };

  const copyTrade = (trade: BookmarksTradeStruct) => {
    const url = getTradeUrl(
      trade.location.version,
      trade.location.type,
      trade.location.slug,
      trade.location.league || tradeLocationService.current.league || "Standard"
    );
    void copyToClipboard(url).then(() => {
      flashMessages.success(`Copied ${trade.title} to clipboard`);
    }).catch(() => {
      flashMessages.alert("Couldn't copy the trade URL.");
    });
  };

  const deleteTrade = async (trade: BookmarksTradeStruct) => {
    if (!folder.id || !trade.id) return;
    await bookmarksService.deleteTrade(trade.id, folder.id);
    await loadTrades();
  };

  const duplicateTrade = async (trade: BookmarksTradeStruct) => {
    if (!folder.id) return;
    await bookmarksService.duplicateTrade(trade, folder.id);
    await loadTrades();
    flashMessages.success(`Duplicated ${trade.title}`);
  };

  let draggedIndex: number | null = null;
  let dragOverIndex: number | null = null;

  const handleDragStart = (e: DragEvent, index: number) => {
    draggedIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", index.toString());
    }
  };

  const handleDragEnter = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      dragOverIndex = index;
    }
  };

  const handleDrop = async (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index && folder.id) {
      const trade = trades[draggedIndex];
      if (trade && trade.id) {
        // Optimistic UI update
        const moved = trades.splice(draggedIndex, 1)[0];
        trades.splice(index, 0, moved);
        trades = [...trades];
        // Background sync
        await bookmarksService.moveTrade(trade.id, folder.id, index);
        await loadTrades();
      }
    }
    draggedIndex = null;
    dragOverIndex = null;
  };

  const handleDragEnd = () => {
    draggedIndex = null;
    dragOverIndex = null;
  };

  const createTradeFromCurrent = async () => {
    if (!folder.id) return;
    const current = tradeLocationService.current;
    if (!current.slug) {
        flashMessages.alert("Not on a valid trade page");
        return;
    }
    if (!current.type) {
        flashMessages.alert("Missing trade type for the current search.");
        return;
    }
    const trade = bookmarksService.initializeTradeStructFrom({
      version: current.version,
      type: current.type,
      slug: current.slug,
      league: current.league
    });
    const activeTabTitle = await getActiveTradeTabTitle();
    trade.title = (activeTabTitle || document.title).replace(" - Path of Exile", "").replace(/⚡ /g, "") || "New Trade";
    await bookmarksService.persistTrade(trade, folder.id);
    await loadTrades();
    flashMessages.success(`Added "${trade.title}" to folder`);
  };

  const openTrade = async (trade: BookmarksTradeStruct) => {
    await openUrlInActiveTab(
      getTradeUrl(
        trade.location.version,
        trade.location.type,
        trade.location.slug,
        trade.location.league || tradeLocationService.current.league || "Standard"
      )
    );
  };

  const exportFolder = () => {
      const serialized = bookmarksService.serializeFolder(folder, trades);
      void copyToClipboard(serialized).then(() => {
        flashMessages.success("Folder data copied to clipboard!");
      }).catch(() => {
        flashMessages.alert("Couldn't copy the folder data.");
      });
  };

  let editingFolder = false;
  let folderEditTitle = "";

  const startEditingFolder = () => {
      folderEditTitle = folder.title;
      editingFolder = true;
  };

  const saveFolderTitle = async () => {
      editingFolder = false;
      const newTitle = folderEditTitle.trim();
      if (!newTitle || newTitle === folder.title) return;

      await bookmarksService.renameFolder(folder, newTitle);
      folder.title = newTitle;
      flashMessages.success(`Renamed folder to "${newTitle}"`);
  };

  const cancelFolderEdit = () => {
      editingFolder = false;
  };

  let editingTradeId: string | null = null;
  let tradeEditTitle = "";

  const startEditingTrade = (trade: BookmarksTradeStruct) => {
    if (!trade.id) return;
    editingTradeId = trade.id;
    tradeEditTitle = trade.title;
  };

  const saveTradeTitle = async (trade: BookmarksTradeStruct) => {
    editingTradeId = null;
    const newTitle = tradeEditTitle.trim();
    if (!newTitle || !folder.id || newTitle === trade.title) return;

    await bookmarksService.renameTrade(trade, folder.id, newTitle);
    await loadTrades();
    flashMessages.success(`Renamed search to "${newTitle}"`);
  };

  const cancelTradeEdit = () => {
    editingTradeId = null;
  };

  const normalizeIcon = (svg: string) =>
    svg.replace(/<svg\b([^>]*)>/, (_match, attrs) => {
      const nextAttrs = attrs
        .replace(/\sclass="[^"]*"/g, "")
        .replace(/\swidth="[^"]*"/g, "")
        .replace(/\sheight="[^"]*"/g, "")
        .replace(/\sviewBox="[^"]*"/g, "")
        .trim();

      return `<svg ${nextAttrs} viewBox="-2 -2 28 28" class="bookmark-folder-icon">`;
    });

  const icons = {
    archive: normalizeIcon(archiveIcon),
    restore: normalizeIcon(archiveRestoreIcon),
    check: normalizeIcon(checkIcon),
    copy: normalizeIcon(copyIcon),
    edit: normalizeIcon(editIcon),
    replace: normalizeIcon(replaceIcon),
    trash: normalizeIcon(trashIcon),
    upload: normalizeIcon(uploadIcon)
  };

  const replaceSearchWithCurrent = async (trade: BookmarksTradeStruct) => {
    if (!folder.id || !trade.id) return;
    
    const current = tradeLocationService.current;
    if (!current.slug) {
        flashMessages.alert("Not on a valid trade page");
        return;
    }
    if (!current.type) {
        flashMessages.alert("Missing trade type for the current search.");
        return;
    }

    const updatedTrade: BookmarksTradeStruct = {
      ...trade,
      location: {
        version: current.version,
        type: current.type,
        slug: current.slug,
        league: current.league
      }
    };

    await bookmarksService.persistTrade(updatedTrade, folder.id);
    await loadTrades();
    flashMessages.success(`Updated search location for "${trade.title}"`);
  };

</script>

<div class="folder {isExpanded ? 'is-expanded' : ''} {isArchived ? 'is-archived' : ''}">
  <div class="header">
    <button 
        type="button"
        class="expansion-wrapper" 
        on:click={(e) => { e.stopPropagation(); if (!editingFolder) onToggleExpansion(folder.id || "")}}
        aria-expanded={isExpanded}
        aria-label="{isExpanded ? 'Collapse' : 'Expand'} {folder.title}"
    >
        {#if editingFolder}
          <input 
            type="text" 
            class="inline-edit-input" 
            bind:value={folderEditTitle} 
            on:blur={saveFolderTitle} 
            on:keydown={e => { if (e.key === 'Enter') saveFolderTitle(); if (e.key === 'Escape') cancelFolderEdit(); }} 
            autofocus 
            on:click|stopPropagation
          />
        {:else}
          <div class="header-copy">
            <div class="header-label">{folder.title}</div>
          </div>
        {/if}
        {#if !isArchived}
            <span class="indicator">{isExpanded ? "▼" : "▶"}</span>
        {/if}
    </button>
    
    <div class="header-actions">
      <button
        type="button"
        class="folder-action"
        title="Edit folder"
        aria-label="Edit folder"
        on:click|stopPropagation={startEditingFolder}>
        <span class="action-icon" aria-hidden="true">{@html icons.edit}</span>
      </button>
      <button
        type="button"
        class="folder-action"
        title={isArchived ? "Restore folder" : "Archive folder"}
        aria-label={isArchived ? "Restore folder" : "Archive folder"}
        on:click={onArchiveEvent}>
        <span class="action-icon" aria-hidden="true">{@html isArchived ? icons.restore : icons.archive}</span>
      </button>
      <button
        type="button"
        class="folder-action"
        title="Export folder"
        aria-label="Export folder"
        on:click={exportFolder}>
        <span class="action-icon" aria-hidden="true">{@html icons.upload}</span>
      </button>
      <button
        type="button"
        class="folder-action is-danger"
        title="Delete folder"
        aria-label="Delete folder"
        on:click={onDeleteEvent}>
        <span class="action-icon" aria-hidden="true">{@html icons.trash}</span>
      </button>
    </div>
  </div>

  {#if isExpanded}
    <div class="trades-content">
      <LoadingContainer {isLoading} size="small">
        <ul class="trades-list">
          {#each trades as trade, i (trade.id)}
            <li class="trade-item"
                class:is-dragging={draggedIndex === i}
                class:is-drag-over={dragOverIndex === i}
                draggable="true"
                on:dragstart={(e) => handleDragStart(e, i)}
                on:dragenter={(e) => handleDragEnter(e, i)}
                on:dragover|preventDefault
                on:drop|preventDefault={(e) => handleDrop(e, i)}
                on:dragend={handleDragEnd}>
              <div class="drag-handle" title="Drag to reorder">≡</div>
              <div class="trade-info">
                {#if trade.completedAt}<span class="check">✓</span>{/if}
                {#if editingTradeId === trade.id}
                  <input 
                    type="text" 
                    class="inline-edit-input trade-edit" 
                    bind:value={tradeEditTitle} 
                    on:blur={() => saveTradeTitle(trade)} 
                    on:keydown={e => { if (e.key === 'Enter') saveTradeTitle(trade); if (e.key === 'Escape') cancelTradeEdit(); }} 
                    autofocus 
                    on:click|stopPropagation
                  />
                {:else}
                  <div class="trade-copy">
                    <a
                      class="trade-link"
                      href={getTradeUrl(trade.location.version, trade.location.type, trade.location.slug, trade.location.league || tradeLocationService.current.league || 'Standard')}
                      on:click|preventDefault={() => void openTrade(trade)}
                    >
                      {trade.title}
                    </a>
                    <div class="trade-meta">
                      {trade.location.league || tradeLocationService.current.league || "Standard"}
                    </div>
                  </div>
                {/if}
              </div>
              <div class="trade-actions">
                <button
                  type="button"
                  class="trade-action"
                  title="Edit search name"
                  aria-label="Edit search name"
                  on:click|stopPropagation={() => startEditingTrade(trade)}>
                  <span class="action-icon" aria-hidden="true">{@html icons.edit}</span>
                </button>
                <button
                  type="button"
                  class="trade-action"
                  title="Replace with current search"
                  aria-label="Replace with current search"
                  on:click={() => void replaceSearchWithCurrent(trade)}>
                  <span class="action-icon" aria-hidden="true">{@html icons.replace}</span>
                </button>
                <button
                  type="button"
                  class="trade-action"
                  title="Copy URL"
                  aria-label="Copy URL"
                  on:click={() => copyTrade(trade)}>
                  <span class="action-icon" aria-hidden="true">{@html icons.copy}</span>
                </button>
                <button
                  type="button"
                  class="trade-action"
                  class:is-active={!!trade.completedAt}
                  title={trade.completedAt ? "Mark as pending" : "Mark as complete"}
                  aria-label={trade.completedAt ? "Mark as pending" : "Mark as complete"}
                  on:click={() => void toggleTrade(trade)}>
                  <span class="action-icon" aria-hidden="true">{@html icons.check}</span>
                </button>
                <button
                  type="button"
                  class="trade-action is-danger"
                  title="Delete trade"
                  aria-label="Delete trade"
                  on:click={() => void deleteTrade(trade)}>
                  <span class="action-icon" aria-hidden="true">{@html icons.trash}</span>
                </button>
              </div>
            </li>
          {/each}
        </ul>
        <div class="footer-actions">
            <Button label="Save current search" theme="gold" onClick={createTradeFromCurrent} />
        </div>
      </LoadingContainer>
    </div>
  {/if}
</div>

<style lang="scss">
  @use "../lib/styles/variables" as *;

  .folder {
    margin-bottom: 10px;
    border: 1px solid rgba($gold, 0.12);
    border-radius: 8px;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba($gold, 0.035), rgba($gold, 0.015)),
      rgba($black, 0.4);
    box-shadow:
      inset 0 1px 0 rgba($white, 0.02),
      0 8px 18px rgba(0, 0, 0, 0.18);

    &.is-archived { opacity: 0.72; }
  }

  .header {
    display: flex;
    align-items: stretch;
    gap: 8px;
    background:
      linear-gradient(180deg, rgba($blue-alt, 0.92), rgba($blue, 0.96)),
      $blue;
    padding: 8px 10px;
    color: $white;
    font-family: $primary-font;
    border-bottom: 1px solid rgba($gold, 0.1);
  }

  .expansion-wrapper {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    text-align: left;
    width: 100%;
    outline: none;
  }

  .header-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .header-label {
    flex: 1;
    font-size: 14px;
    color: rgba($white, 0.96);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .inline-edit-input {
    flex: 1;
    background: rgba($black, 0.4);
    border: 1px solid rgba($gold, 0.5);
    color: $white;
    font-family: $primary-font;
    font-size: 14px;
    padding: 2px 6px;
    border-radius: 2px;
    outline: none;
    margin-right: 8px;

    &:focus {
      border-color: $gold;
      box-shadow: 0 0 0 1px rgba($gold, 0.2);
    }
  }

  .trade-edit {
    font-size: 12px;
    margin-right: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    padding-left: 8px;
    border-left: 1px solid rgba($white, 0.06);
  }

  .folder-action {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid rgba($white, 0.14);
    background-color: rgba($black, 0.22);
    color: rgba($white, 0.88);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;

    &:hover {
      background-color: rgba($white, 0.08);
      border-color: rgba($gold, 0.38);
      color: $white;
    }

    &.is-danger:hover {
      background-color: rgba($red, 0.18);
      border-color: rgba($red, 0.5);
      color: #ffd7d7;
    }
  }

  .action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 13px;
    height: 13px;
    font-size: 0;
  }

  .action-icon :global(.bookmark-folder-icon) {
    width: 13px;
    height: 13px;
    min-width: 13px;
    min-height: 13px;
    display: block;
    overflow: visible;
    stroke-width: 1.7;
  }

  .trades-list {
    list-style: none;
    padding: 10px;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background:
      linear-gradient(180deg, rgba($white, 0.015), rgba($white, 0)),
      rgba($black, 0.36);
  }

  .trade-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border: 1px solid rgba($white, 0.06);
    border-radius: 6px;
    background: rgba($black, 0.34);
    transition: background-color 0.2s, border-color 0.2s, opacity 0.2s, transform 0.2s;
    
    &:hover {
      background-color: rgba($white, 0.05);
      border-color: rgba($gold, 0.16);
      transform: translateY(-1px);
    }

    &.is-dragging {
      opacity: 0.3;
      background-color: rgba($gold, 0.1);
    }
    
    &.is-drag-over {
      border-bottom: 2px solid $gold;
      background-color: rgba($gold, 0.15);
    }
  }

  .drag-handle {
    cursor: grab;
    color: rgba($white, 0.3);
    font-size: 15px;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    flex: 0 0 16px;
    
    &:hover {
        color: $gold;
    }
    &:active {
        cursor: grabbing;
    }
  }

  .trade-info {
    display: flex;
    align-items: center;
    min-width: 0;
    flex: 1;
    gap: 6px;
  }

  .trade-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .trade-link {
    color: $white;
    text-decoration: none;
    font-size: 13px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover { text-decoration: underline; }
  }

  .trade-meta {
    font-size: 10px;
    color: rgba($gold-alt, 0.58);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .trade-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    padding-left: 8px;
    border-left: 1px solid rgba($white, 0.05);
  }

  .trade-action {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid rgba($white, 0.12);
    background-color: rgba($black, 0.45);
    color: rgba($white, 0.82);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;

    &:hover {
      background-color: rgba($white, 0.08);
      border-color: rgba($gold, 0.38);
      color: $white;
    }

    &.is-active {
      background-color: rgba($green, 0.18);
      border-color: rgba($green, 0.5);
      color: #d7ffd7;
    }

    &.is-danger:hover {
      background-color: rgba($red, 0.18);
      border-color: rgba($red, 0.5);
      color: #ffd7d7;
    }
  }

  .check {
    color: $green;
    margin-right: 5px;
    flex: 0 0 auto;
  }

  .indicator {
    flex: 0 0 auto;
    color: rgba($gold-alt, 0.78);
    font-size: 11px;
  }

  .trades-content {
    background: rgba($black, 0.24);
  }

  .footer-actions {
    padding: 0 10px 10px;
    display: flex;
  }
</style>
