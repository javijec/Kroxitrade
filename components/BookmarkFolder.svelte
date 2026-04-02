<script lang="ts">
  import { flip } from "svelte/animate";
  import { slide } from "svelte/transition";
  import archiveIcon from "data-text:lucide-static/icons/archive.svg";
  import archiveRestoreIcon from "data-text:lucide-static/icons/archive-restore.svg";
  import checkIcon from "data-text:lucide-static/icons/check.svg";
  import copyIcon from "data-text:lucide-static/icons/copy.svg";
  import editIcon from "data-text:lucide-static/icons/pencil.svg";
  import gripVerticalIcon from "data-text:lucide-static/icons/grip-vertical.svg";
  import replaceIcon from "data-text:lucide-static/icons/refresh-cw.svg";
  import trashIcon from "data-text:lucide-static/icons/trash-2.svg";
  import uploadIcon from "data-text:lucide-static/icons/upload.svg";
  import { languageStore, translate } from "../lib/services/i18n";
  import type { BookmarksFolderStruct, BookmarksTradeStruct } from "../lib/types/bookmarks";
  import { bookmarksService } from "../lib/services/bookmarks";
  import { getActiveTradeTabTitle, openUrlInActiveTab } from "../lib/services/active-trade-tab";
  import { tradeLocationService } from "../lib/services/trade-location";
  import { flashMessages } from "../lib/services/flash";
  import { searchPanelService } from "../lib/services/search-panel";
  import { getTradeUrl } from "../lib/utilities/trade-url";
  import { copyToClipboard } from "../lib/utilities/copy-to-clipboard";
  
  import Button from "./Button.svelte";
  import LoadingContainer from "./LoadingContainer.svelte";

  export let folder: BookmarksFolderStruct;
  export let expandedFolderIds: string[];
  export let onToggleExpansion: (id: string) => void;
  export let onArchiveEvent: () => void;
  export let onDeleteEvent: () => void;
  export let onFolderDragStart: (event: DragEvent, id: string) => void = () => {};
  export let onFolderDragEnter: (event: DragEvent, id: string) => void = () => {};
  export let onFolderDrop: (event: DragEvent, id: string) => void = () => {};
  export let onFolderDragEnd: () => void = () => {};
  export let isFolderDragging = false;
  export let isFolderDragOver = false;

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

  const formatTradeMeta = (trade: BookmarksTradeStruct) => {
    const meta: string[] = [];
    const league = trade.location.league || tradeLocationService.current.league || "Standard";

    meta.push(formatLeagueLabel(league));

    if (trade.location.type) {
      meta.push(trade.location.type);
    }

    return meta.join(translate($languageStore, "folder.metaSeparator"));
  };

  const formatLeagueLabel = (league: string) => {
    const normalizedLeague = league.replace(/^(poe2|xbox|sony)\//i, "");

    try {
      return decodeURIComponent(normalizedLeague);
    } catch {
      return normalizedLeague.replace(/%20/g, " ");
    }
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
      flashMessages.success(translate($languageStore, "folder.copiedTrade", { title: trade.title }));
    }).catch(() => {
      flashMessages.alert(translate($languageStore, "folder.copyTradeError"));
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
    flashMessages.success(translate($languageStore, "folder.duplicatedTrade", { title: trade.title }));
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
        flashMessages.alert(translate($languageStore, "folder.invalidTradePage"));
        return;
    }
    if (!current.type) {
        flashMessages.alert(translate($languageStore, "folder.missingTradeType"));
        return;
    }
    const trade = bookmarksService.initializeTradeStructFrom({
      version: current.version,
      type: current.type,
      slug: current.slug,
      league: current.league
    });
    const activeTabTitle = await getActiveTradeTabTitle();
    trade.title =
      searchPanelService.recommendTitle() ||
      (activeTabTitle || document.title).replace(" - Path of Exile", "").replace(/⚡ /g, "") ||
      "Trade";
    await bookmarksService.persistTrade(trade, folder.id);
    await loadTrades();
    flashMessages.success(translate($languageStore, "folder.addedToFolder", { title: trade.title }));
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
        flashMessages.success(translate($languageStore, "folder.copiedFolder"));
      }).catch(() => {
        flashMessages.alert(translate($languageStore, "folder.copyFolderError"));
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
      flashMessages.success(translate($languageStore, "folder.renamedFolder", { title: newTitle }));
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
    flashMessages.success(translate($languageStore, "folder.renamedSearch", { title: newTitle }));
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
    grip: normalizeIcon(gripVerticalIcon),
    replace: normalizeIcon(replaceIcon),
    trash: normalizeIcon(trashIcon),
    upload: normalizeIcon(uploadIcon)
  };

  const replaceSearchWithCurrent = async (trade: BookmarksTradeStruct) => {
    if (!folder.id || !trade.id) return;
    
    const current = tradeLocationService.current;
    if (!current.slug) {
        flashMessages.alert(translate($languageStore, "folder.invalidTradePage"));
        return;
    }
    if (!current.type) {
        flashMessages.alert(translate($languageStore, "folder.missingTradeType"));
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
    flashMessages.success(translate($languageStore, "folder.updatedSearchLocation", { title: trade.title }));
  };

</script>

<div
  role="region"
  class="folder {isExpanded ? 'is-expanded' : ''} {isArchived ? 'is-archived' : ''}"
  class:is-folder-dragging={isFolderDragging}
  class:is-folder-drag-over={isFolderDragOver}
  draggable="true"
  on:dragstart={(e) => onFolderDragStart(e, folder.id || "")}
  on:dragenter={(e) => onFolderDragEnter(e, folder.id || "")}
  on:dragover|preventDefault
  on:drop|preventDefault={(e) => onFolderDrop(e, folder.id || "")}
  on:dragend={onFolderDragEnd}
>
  <div class="header">
    <div class="folder-drag-handle" title={translate($languageStore, "folder.dragReorder")} aria-hidden="true" role="button">
      <span class="action-icon">{@html icons.grip}</span>
    </div>
    <button 
        type="button"
        class="expansion-wrapper" 
        on:click={(e) => { e.stopPropagation(); if (!editingFolder) onToggleExpansion(folder.id || "")}}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? translate($languageStore, "folder.collapse") : translate($languageStore, "folder.expand")} ${folder.title}`}
    >
        {#if editingFolder}
          <input 
            type="text" 
            class="inline-edit-input" 
            bind:value={folderEditTitle} 
            on:blur={saveFolderTitle} 
            on:keydown={e => { if (e.key === 'Enter') saveFolderTitle(); if (e.key === 'Escape') cancelFolderEdit(); }} 
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
        title={translate($languageStore, "folder.editFolder")}
        aria-label={translate($languageStore, "folder.editFolder")}
        on:click|stopPropagation={startEditingFolder}>
        <span class="action-icon" aria-hidden="true">{@html icons.edit}</span>
      </button>
      <button
        type="button"
        class="folder-action"
        title={isArchived ? translate($languageStore, "folder.restoreFolder") : translate($languageStore, "folder.archiveFolder")}
        aria-label={isArchived ? translate($languageStore, "folder.restoreFolder") : translate($languageStore, "folder.archiveFolder")}
        on:click={onArchiveEvent}>
        <span class="action-icon" aria-hidden="true">{@html isArchived ? icons.restore : icons.archive}</span>
      </button>
      <button
        type="button"
        class="folder-action"
        title={translate($languageStore, "folder.exportFolder")}
        aria-label={translate($languageStore, "folder.exportFolder")}
        on:click={exportFolder}>
        <span class="action-icon" aria-hidden="true">{@html icons.upload}</span>
      </button>
      <button
        type="button"
        class="folder-action is-danger"
        title={translate($languageStore, "folder.deleteFolder")}
        aria-label={translate($languageStore, "folder.deleteFolder")}
        on:click={onDeleteEvent}>
        <span class="action-icon" aria-hidden="true">{@html icons.trash}</span>
      </button>
    </div>
  </div>

  {#if isExpanded}
    <div class="trades-content" transition:slide={{ duration: 180 }}>
      <LoadingContainer {isLoading} size="small">
        <ul class="trades-list">
          {#each trades as trade, i (trade.id)}
            <li class="trade-item"
                animate:flip={{ duration: 180 }}
                class:is-completed={!!trade.completedAt}
                class:is-dragging={draggedIndex === i}
                class:is-drag-over={dragOverIndex === i}
                draggable="true"
                on:dragstart={(e) => handleDragStart(e, i)}
                on:dragenter={(e) => handleDragEnter(e, i)}
                on:dragover|preventDefault
                on:drop|preventDefault={(e) => handleDrop(e, i)}
                on:dragend={handleDragEnd}>
              <div class="drag-handle" title={translate($languageStore, "folder.dragTrade")}>≡</div>
              <div class="trade-info">
                {#if trade.completedAt}<span class="check">✓</span>{/if}
                {#if editingTradeId === trade.id}
                  <input 
                    type="text" 
                    class="inline-edit-input trade-edit" 
                    bind:value={tradeEditTitle} 
                    on:blur={() => saveTradeTitle(trade)} 
                    on:keydown={e => { if (e.key === 'Enter') saveTradeTitle(trade); if (e.key === 'Escape') cancelTradeEdit(); }} 
                    on:click|stopPropagation
                  />
                {:else}
                  <div class="trade-copy">
                    <a
                      class="trade-link"
                      href={getTradeUrl(trade.location.version, trade.location.type, trade.location.slug, trade.location.league || tradeLocationService.current.league || 'Standard')}
                      title={trade.title}
                      on:click|preventDefault={() => void openTrade(trade)}
                    >
                      {trade.title}
                    </a>
                    <div class="trade-meta">
                      {formatTradeMeta(trade)}
                    </div>
                  </div>
                {/if}
              </div>
              <div class="trade-actions">
                <button
                  type="button"
                  class="trade-action"
                  title={translate($languageStore, "folder.editSearchName")}
                  aria-label={translate($languageStore, "folder.editSearchName")}
                  on:click|stopPropagation={() => startEditingTrade(trade)}>
                  <span class="action-icon" aria-hidden="true">{@html icons.edit}</span>
                </button>
                <button
                  type="button"
                  class="trade-action"
                  title={translate($languageStore, "folder.replaceCurrentSearch")}
                  aria-label={translate($languageStore, "folder.replaceCurrentSearch")}
                  on:click={() => void replaceSearchWithCurrent(trade)}>
                  <span class="action-icon" aria-hidden="true">{@html icons.replace}</span>
                </button>
                <button
                  type="button"
                  class="trade-action"
                  title={translate($languageStore, "folder.copyUrl")}
                  aria-label={translate($languageStore, "folder.copyUrl")}
                  on:click={() => copyTrade(trade)}>
                  <span class="action-icon" aria-hidden="true">{@html icons.copy}</span>
                </button>
                <button
                  type="button"
                  class="trade-action"
                  class:is-active={!!trade.completedAt}
                  title={trade.completedAt ? translate($languageStore, "folder.markPending") : translate($languageStore, "folder.markComplete")}
                  aria-label={trade.completedAt ? translate($languageStore, "folder.markPending") : translate($languageStore, "folder.markComplete")}
                  on:click={() => void toggleTrade(trade)}>
                  <span class="action-icon" aria-hidden="true">{@html icons.check}</span>
                </button>
                <button
                  type="button"
                  class="trade-action is-danger"
                  title={translate($languageStore, "folder.deleteTrade")}
                  aria-label={translate($languageStore, "folder.deleteTrade")}
                  on:click={() => void deleteTrade(trade)}>
                  <span class="action-icon" aria-hidden="true">{@html icons.trash}</span>
                </button>
              </div>
            </li>
          {/each}
        </ul>
        <div class="footer-actions">
            <Button label={translate($languageStore, "folder.saveCurrentSearch")} theme="gold" onClick={createTradeFromCurrent} />
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
    transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;

    &.is-archived { opacity: 0.72; }

    &.is-folder-dragging {
      opacity: 0.45;
      transform: scale(0.985);
    }

    &.is-folder-drag-over {
      border-color: rgba($gold, 0.34);
      box-shadow:
        inset 0 1px 0 rgba($white, 0.02),
        0 0 0 1px rgba($gold, 0.2),
        0 10px 22px rgba(0, 0, 0, 0.24);
    }
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

  .folder-drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 20px;
    color: rgba($gold-alt, 0.46);
    cursor: grab;
    user-select: none;

    &:active {
      cursor: grabbing;
    }
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

    &.is-completed {
      background: rgba($green, 0.14);
      border-color: rgba($green, 0.28);
    }
    
    &.is-drag-over {
      border-color: rgba($gold, 0.42);
      background-color: rgba($gold, 0.15);
      box-shadow: 0 0 0 1px rgba($gold, 0.18);
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
    gap: 4px;
  }

  .trade-link {
    color: $white;
    text-decoration: none;
    font-size: 13px;
    line-height: 1.15;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover { text-decoration: underline; }
  }

  .trade-meta {
    font-size: 10px;
    line-height: 1.2;
    color: rgba($gold-alt, 0.52);
    letter-spacing: 0.03em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
