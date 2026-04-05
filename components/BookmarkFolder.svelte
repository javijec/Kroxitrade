<script lang="ts">
  import gripVerticalIcon from "data-text:lucide-static/icons/grip-vertical.svg"
  import { flip } from "svelte/animate"
  import { slide } from "svelte/transition"

  import {
    getActiveTradeTabTitle,
    openUrlInActiveTab
  } from "../lib/services/active-trade-tab"
  import { bookmarksService } from "../lib/services/bookmarks"
  import { flashMessages } from "../lib/services/flash"
  import { languageStore, translate } from "../lib/services/i18n"
  import { searchPanelService } from "../lib/services/search-panel"
  import { settings } from "../lib/services/settings"
  import { tradeLocationService } from "../lib/services/trade-location"
  import type {
    BookmarksFolderStruct,
    BookmarksTradeStruct
  } from "../lib/types/bookmarks"
  import { copyToClipboard } from "../lib/utilities/copy-to-clipboard"
  import { getTradeUrl } from "../lib/utilities/trade-url"
  import { normalizeIcon } from "../lib/utilities/icons"
  import { formatLeagueLabel } from "../lib/utilities/league"
  import Button from "./Button.svelte"
  import ConfirmDialog from "./ConfirmDialog.svelte"
  import FolderActionsMenu from "./FolderActionsMenu.svelte"
  import LoadingContainer from "./LoadingContainer.svelte"
  import TradeActionsMenu from "./TradeActionsMenu.svelte"

  export let folder: BookmarksFolderStruct
  export let expandedFolderIds: string[]
  export let onToggleExpansion: (id: string) => void
  export let onArchiveEvent: () => void
  export let onDeleteEvent: () => void
  export let onFolderDragStart: (
    event: DragEvent,
    id: string
  ) => void = () => {}
  export let onFolderDragEnter: (
    event: DragEvent,
    id: string
  ) => void = () => {}
  export let onFolderDrop: (event: DragEvent, id: string) => void = () => {}
  export let onFolderDragEnd: () => void = () => {}
  export let isFolderDragging = false
  export let isFolderDragOver = false
  export let isTutorialSaveTarget = false

  let trades: BookmarksTradeStruct[] = []
  let isLoading = false
  let hasLoadedTrades = false
  let isDuplicating = false
  let tradePendingDelete: BookmarksTradeStruct | null = null

  $: isExpanded = expandedFolderIds.includes(folder.id || "")
  $: isArchived = !!folder.archivedAt
  $: if (!isExpanded) {
    hasLoadedTrades = false
  }
  $: if (isExpanded && !hasLoadedTrades && !isLoading) {
    void loadTrades()
  }
  const loadTrades = async () => {
    if (!folder.id) return
    isLoading = true
    try {
      trades = await bookmarksService.fetchTradesByFolderId(folder.id)
    } catch {
      flashMessages.alert(translate($languageStore, "folder.loadTradesError"))
    } finally {
      hasLoadedTrades = true
      isLoading = false
    }
  }

  const formatTradeMeta = (trade: BookmarksTradeStruct) => {
    const meta: string[] = []
    const league =
      trade.location.league || tradeLocationService.current.league || "Standard"

    meta.push(formatLeagueLabel(league))

    return meta.join(translate($languageStore, "folder.metaSeparator"))
  }

  const toggleTrade = async (trade: BookmarksTradeStruct) => {
    if (!folder.id) return
    await bookmarksService.toggleTradeCompletion(trade, folder.id)
    await loadTrades()
  }

  const copyTrade = (trade: BookmarksTradeStruct) => {
    const url = getTradeUrl(
      trade.location.version,
      trade.location.type,
      trade.location.slug,
      trade.location.league || tradeLocationService.current.league || "Standard"
    )
    void copyToClipboard(url)
      .then(() => {
        flashMessages.success(
          translate($languageStore, "folder.copiedTrade", {
            title: trade.title
          })
        )
      })
      .catch(() => {
        flashMessages.alert(translate($languageStore, "folder.copyTradeError"))
      })
  }

  const openTradeLive = async (trade: BookmarksTradeStruct) => {
    await openUrlInActiveTab(
      getTradeUrl(
        trade.location.version,
        trade.location.type,
        trade.location.slug,
        trade.location.league ||
          tradeLocationService.current.league ||
          "Standard",
        "/live"
      )
    )
  }

  const deleteTrade = async (trade: BookmarksTradeStruct) => {
    if (!folder.id || !trade.id) return
    try {
      await bookmarksService.deleteTrade(trade.id, folder.id)
      await loadTrades()
      tradePendingDelete = null
    } catch {
      flashMessages.alert(translate($languageStore, "folder.deleteTradeError"))
    }
  }

  const requestTradeDelete = (trade: BookmarksTradeStruct) => {
    tradePendingDelete = trade
  }

  const cancelTradeDelete = () => {
    tradePendingDelete = null
  }

  const duplicateTrade = async (trade: BookmarksTradeStruct) => {
    if (!folder.id || isDuplicating) return
    isDuplicating = true
    try {
      await bookmarksService.duplicateTrade(trade, folder.id)
      await loadTrades()
      flashMessages.success(
        translate($languageStore, "folder.duplicatedTrade", {
          title: trade.title
        })
      )
    } catch {
      flashMessages.alert(translate($languageStore, "folder.duplicateTradeError"))
    } finally {
      isDuplicating = false
    }
  }

  let draggedIndex: number | null = null
  let dragOverIndex: number | null = null

  const handleDragStart = (e: DragEvent, index: number) => {
    draggedIndex = index
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/plain", index.toString())
    }
  }

  const handleDragEnter = (e: DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      dragOverIndex = index
    }
  }

  const handleDrop = async (e: DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index && folder.id) {
      const trade = trades[draggedIndex]
      if (trade && trade.id) {
        // Optimistic UI update
        const moved = trades.splice(draggedIndex, 1)[0]
        trades.splice(index, 0, moved)
        trades = [...trades]
        // Background sync
        await bookmarksService.moveTrade(trade.id, folder.id, index)
        await loadTrades()
      }
    }
    draggedIndex = null
    dragOverIndex = null
  }

  const handleDragEnd = () => {
    draggedIndex = null
    dragOverIndex = null
  }

  const createTradeFromCurrent = async () => {
    if (!folder.id) return
    const current = tradeLocationService.current
    if (!current.slug) {
      flashMessages.alert(translate($languageStore, "folder.invalidTradePage"))
      return
    }
    if (!current.type) {
      flashMessages.alert(translate($languageStore, "folder.missingTradeType"))
      return
    }
    const trade = bookmarksService.initializeTradeStructFrom({
      version: current.version,
      type: current.type,
      slug: current.slug,
      league: current.league
    })
    const activeTabTitle = await getActiveTradeTabTitle()
    trade.title =
      searchPanelService.recommendTitle() ||
      (activeTabTitle || document.title)
        .replace(" - Path of Exile", "")
        .replace(/⚡ /g, "") ||
      "Trade"
    await bookmarksService.persistTrade(trade, folder.id)
    await loadTrades()
    flashMessages.success(
      translate($languageStore, "folder.addedToFolder", { title: trade.title })
    )
  }

  const openTrade = async (trade: BookmarksTradeStruct) => {
    await openUrlInActiveTab(
      getTradeUrl(
        trade.location.version,
        trade.location.type,
        trade.location.slug,
        trade.location.league ||
          tradeLocationService.current.league ||
          "Standard"
      )
    )
  }

  const exportFolder = () => {
    const serialized = bookmarksService.serializeFolder(folder, trades)
    void copyToClipboard(serialized)
      .then(() => {
        flashMessages.success(translate($languageStore, "folder.copiedFolder"))
      })
      .catch(() => {
        flashMessages.alert(translate($languageStore, "folder.copyFolderError"))
      })
  }

  const duplicateFolder = async () => {
    if (isDuplicating) return
    isDuplicating = true
    try {
      await bookmarksService.duplicateFolder(folder)
      flashMessages.success(
        translate($languageStore, "folder.duplicatedFolder", {
          title: folder.title
        })
      )
    } catch {
      flashMessages.alert(translate($languageStore, "folder.duplicateFolderError"))
    } finally {
      isDuplicating = false
    }
  }

  let editingFolder = false
  let folderEditTitle = ""
  let isSavingFolderTitle = false

  const startEditingFolder = () => {
    folderEditTitle = folder.title
    editingFolder = true
  }

  const saveFolderTitle = async () => {
    if (isSavingFolderTitle) return
    editingFolder = false
    const newTitle = folderEditTitle.trim()
    if (!newTitle || newTitle === folder.title) return

    isSavingFolderTitle = true
    try {
      await bookmarksService.renameFolder(folder, newTitle)
      folder.title = newTitle
      flashMessages.success(
        translate($languageStore, "folder.renamedFolder", { title: newTitle })
      )
    } finally {
      isSavingFolderTitle = false
    }
  }

  const cancelFolderEdit = () => {
    editingFolder = false
  }

  let editingTradeId: string | null = null
  let tradeEditTitle = ""
  let savingTradeId: string | null = null

  const startEditingTrade = (trade: BookmarksTradeStruct) => {
    if (!trade.id) return
    editingTradeId = trade.id
    tradeEditTitle = trade.title
  }

  const saveTradeTitle = async (trade: BookmarksTradeStruct) => {
    if (!trade.id || savingTradeId === trade.id) return
    editingTradeId = null
    const newTitle = tradeEditTitle.trim()
    if (!newTitle || !folder.id || newTitle === trade.title) return

    savingTradeId = trade.id
    try {
      await bookmarksService.renameTrade(trade, folder.id, newTitle)
      await loadTrades()
      flashMessages.success(
        translate($languageStore, "folder.renamedSearch", { title: newTitle })
      )
    } finally {
      savingTradeId = null
    }
  }

  const cancelTradeEdit = () => {
    editingTradeId = null
  }

  const icons = {
    grip: normalizeIcon(gripVerticalIcon)
  }

  const replaceSearchWithCurrent = async (trade: BookmarksTradeStruct) => {
    if (!folder.id || !trade.id) return

    const current = tradeLocationService.current
    if (!current.slug) {
      flashMessages.alert(translate($languageStore, "folder.invalidTradePage"))
      return
    }
    if (!current.type) {
      flashMessages.alert(translate($languageStore, "folder.missingTradeType"))
      return
    }

    const updatedTrade: BookmarksTradeStruct = {
      ...trade,
      location: {
        version: current.version,
        type: current.type,
        slug: current.slug,
        league: current.league
      }
    }

    await bookmarksService.persistTrade(updatedTrade, folder.id)
    await loadTrades()
    flashMessages.success(
      translate($languageStore, "folder.updatedSearchLocation", {
        title: trade.title
      })
    )
  }
</script>

<div
  role="region"
  class="folder {isExpanded ? 'is-expanded' : ''} {isArchived
    ? 'is-archived'
    : ''}"
  class:is-folder-dragging={isFolderDragging}
  class:is-folder-drag-over={isFolderDragOver}
  draggable="true"
  on:dragstart={(e) => onFolderDragStart(e, folder.id || "")}
  on:dragenter={(e) => onFolderDragEnter(e, folder.id || "")}
  on:dragover|preventDefault
  on:drop|preventDefault={(e) => onFolderDrop(e, folder.id || "")}
  on:dragend={onFolderDragEnd}>
  <div class="header">
    <div
      class="folder-drag-handle"
      title={translate($languageStore, "folder.dragReorder")}
      aria-hidden="true"
      role="button">
      <span class="action-icon">{@html icons.grip}</span>
    </div>
    <button
      type="button"
      class="expansion-wrapper"
      on:click={(e) => {
        e.stopPropagation()
        if (!editingFolder) onToggleExpansion(folder.id || "")
      }}
      aria-expanded={isExpanded}
      aria-label={`${isExpanded ? translate($languageStore, "folder.collapse") : translate($languageStore, "folder.expand")} ${folder.title}`}>
      {#if editingFolder}
        <input
          type="text"
          class="inline-edit-input"
          bind:value={folderEditTitle}
          on:blur={saveFolderTitle}
          on:keydown={(e) => {
            if (e.key === "Enter") saveFolderTitle()
            if (e.key === "Escape") cancelFolderEdit()
          }}
          on:click|stopPropagation />
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
      <FolderActionsMenu
        {folder}
        onRename={startEditingFolder}
        onArchive={onArchiveEvent}
        onExport={exportFolder}
        onDuplicate={duplicateFolder}
        onDelete={onDeleteEvent} />
    </div>
  </div>

  {#if isExpanded}
    <div class="trades-content" transition:slide={{ duration: 180 }}>
      <LoadingContainer {isLoading} size="small">
        <ul class="trades-list">
          {#each trades as trade, i (trade.id)}
            <li
              class="trade-item"
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
              <div
                class="drag-handle"
                title={translate($languageStore, "folder.dragTrade")}>
                ≡
              </div>
              <div class="trade-content">
                <div class="trade-top">
                  {#if editingTradeId === trade.id}
                    <input
                      type="text"
                      class="inline-edit-input trade-edit"
                      bind:value={tradeEditTitle}
                      on:blur={() => saveTradeTitle(trade)}
                      on:keydown={(e) => {
                        if (e.key === "Enter") saveTradeTitle(trade)
                        if (e.key === "Escape") cancelTradeEdit()
                      }}
                      on:click|stopPropagation />
                  {:else}
                    <div class="trade-copy">
                      <a
                        class="trade-link"
                        href={getTradeUrl(
                          trade.location.version,
                          trade.location.type,
                          trade.location.slug,
                          trade.location.league ||
                            tradeLocationService.current.league ||
                            "Standard"
                        )}
                        title={trade.title}
                        on:click|preventDefault={() => void openTrade(trade)}>
                        {trade.title}
                      </a>
                    </div>
                  {/if}

                  {#if $settings.compactActionsMenu}
                    <div class="trade-actions trade-actions--compact">
                      <TradeActionsMenu
                        {trade}
                        compactText={formatTradeMeta(trade)}
                        onEdit={() => startEditingTrade(trade)}
                        onReplace={() => void replaceSearchWithCurrent(trade)}
                        onCopy={() => copyTrade(trade)}
                        onOpenLive={() => void openTradeLive(trade)}
                        onToggle={() => void toggleTrade(trade)}
                        onDelete={() => requestTradeDelete(trade)} />
                    </div>
                  {/if}
                </div>
                {#if !$settings.compactActionsMenu}
                  <div class="trade-bottom">
                    <div class="trade-meta">{formatTradeMeta(trade)}</div>
                    <div class="trade-actions">
                      <TradeActionsMenu
                        {trade}
                        onEdit={() => startEditingTrade(trade)}
                        onReplace={() => void replaceSearchWithCurrent(trade)}
                        onCopy={() => copyTrade(trade)}
                        onOpenLive={() => void openTradeLive(trade)}
                        onToggle={() => void toggleTrade(trade)}
                        onDelete={() => requestTradeDelete(trade)} />
                    </div>
                  </div>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
        <div class="footer-actions">
          <div
            class="save-search-anchor"
            data-tutorial={isTutorialSaveTarget ? "save-search" : undefined}>
            <Button
              label={translate($languageStore, "folder.saveCurrentSearch")}
              theme="gold"
              onClick={createTradeFromCurrent} />
          </div>
        </div>
      </LoadingContainer>
    </div>
  {/if}
</div>

<ConfirmDialog
  open={!!tradePendingDelete}
  title={translate($languageStore, "confirm.deleteTradeTitle")}
  message={translate($languageStore, "confirm.deleteTradeMessage", {
    title: tradePendingDelete?.title || ""
  })}
  confirmLabel={translate($languageStore, "confirm.delete")}
  cancelLabel={translate($languageStore, "confirm.cancel")}
  onCancel={cancelTradeDelete}
  onConfirm={() => {
    if (tradePendingDelete) {
      void deleteTrade(tradePendingDelete)
    }
  }} />

<style lang="scss">
  @use "../lib/styles/variables" as *;

  .folder {
    margin-bottom: 10px;
    border: 1px solid rgba($gold, 0.12);
    border-radius: 8px;
    overflow: visible;
    background: linear-gradient(180deg, rgba($gold, 0.035), rgba($gold, 0.015)),
      rgba($black, 0.4);
    box-shadow:
      inset 0 1px 0 rgba($white, 0.02),
      0 8px 18px rgba(0, 0, 0, 0.18);
    transition:
      transform 0.18s ease,
      border-color 0.18s ease,
      background-color 0.18s ease,
      box-shadow 0.18s ease;

    &.is-archived {
      opacity: 0.72;
    }

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
    background: linear-gradient(
        180deg,
        rgba($blue-alt, 0.92),
        rgba($blue, 0.96)
      ),
      $blue;
    padding: 8px 10px;
    color: $white;
    font-family: $primary-font;
    border-bottom: 1px solid rgba($gold, 0.1);
    border-radius: 8px 8px 0 0;
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
    min-width: 0;
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
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      color 120ms ease;

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

  .action-icon :global(.action-svg) {
    width: 13px;
    height: 13px;
    min-width: 13px;
    min-height: 13px;
    display: block;
    overflow: visible;
    stroke-width: 1.6;
  }

  .trades-list {
    list-style: none;
    padding: 10px;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: linear-gradient(180deg, rgba($white, 0.015), rgba($white, 0)),
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
    transition:
      background-color 0.2s,
      border-color 0.2s,
      opacity 0.2s,
      transform 0.2s;

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

  .trade-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    min-width: 0;
    gap: 4px;
  }

  .trade-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .trade-bottom {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    width: 100%;
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
    line-height: 1.2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;

    &:hover {
      text-decoration: underline;
    }
  }

  .trade-meta {
    min-width: 0;
    flex: 1;
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
    gap: 3px;
    min-width: 0;
    flex-shrink: 0;
    padding: 0;
    margin: 0;
  }

  .trade-actions--compact {
    margin-left: auto;
  }

  .trade-action {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid rgba($white, 0.12);
    background-color: rgba($black, 0.45);
    color: rgba($white, 0.82);
    font-size: 10px;
    line-height: 1;
    cursor: pointer;
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      color 120ms ease;

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
    border-radius: 0 0 8px 8px;
  }

  .footer-actions {
    padding: 0 10px 10px;
    display: flex;
  }

  .save-search-anchor {
    display: flex;
    width: 100%;
  }
</style>
