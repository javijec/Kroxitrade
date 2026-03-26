<script lang="ts">
  import type { BookmarksFolderStruct, BookmarksTradeStruct } from "../lib/types/bookmarks";
  import { bookmarksService } from "../lib/services/bookmarks";
  import { tradeLocationService } from "../lib/services/trade-location";
  import { flashMessages } from "../lib/services/flash";
  import { getTradeUrl } from "../lib/utilities/trade-url";
  import { copyToClipboard } from "../lib/utilities/copy-to-clipboard";
  
  import Button from "./Button.svelte";
  import LoadingContainer from "./LoadingContainer.svelte";
  import ContextualMenu from "./ContextualMenu.svelte";

  export let folder: BookmarksFolderStruct;
  export let expandedFolderIds: string[];
  export let onEdit: () => void;
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

  const reorderTrade = async (trade: BookmarksTradeStruct, direction: "up" | "down") => {
    if (!folder.id || !trade.id) return;
    await bookmarksService.reorderTrade(trade.id, folder.id, direction);
    await loadTrades();
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
    trade.title = document.title.replace(" - Path of Exile", "").replace(/⚡ /g, "") || "New Trade";
    await bookmarksService.persistTrade(trade, folder.id);
    await loadTrades();
    flashMessages.success(`Added "${trade.title}" to folder`);
  };

  const exportFolder = () => {
      const serialized = bookmarksService.serializeFolder(folder, trades);
      void copyToClipboard(serialized).then(() => {
        flashMessages.success("Folder data copied to clipboard!");
      }).catch(() => {
        flashMessages.alert("Couldn't copy the folder data.");
      });
  };

  const promptForTitle = (label: string, currentTitle: string) => {
    const nextTitle = prompt(label, currentTitle);
    if (nextTitle === null) {
      return null;
    }

    const normalizedTitle = nextTitle.trim();
    if (!normalizedTitle) {
      flashMessages.alert("Name can't be empty.");
      return null;
    }

    if (normalizedTitle === currentTitle) {
      return null;
    }

    return normalizedTitle;
  };

  const editFolder = async () => {
      const newTitle = promptForTitle("Enter new folder name:", folder.title);
      if (!newTitle) return;

      await bookmarksService.renameFolder(folder, newTitle);
      folder.title = newTitle;
      flashMessages.success(`Renamed folder to "${newTitle}"`);
  };

  const editTrade = async (trade: BookmarksTradeStruct) => {
    if (!folder.id) return;

    const newTitle = promptForTitle("Enter new search name:", trade.title);
    if (!newTitle) return;

    await bookmarksService.renameTrade(trade, folder.id, newTitle);
    await loadTrades();
    flashMessages.success(`Renamed search to "${newTitle}"`);
  };

  const menuItems = [
    { label: "Edit Folder", onClick: editFolder },
    { label: isArchived ? "Restore Folder" : "Archive Folder", onClick: onArchiveEvent },
    { label: "Delete Folder", onClick: onDeleteEvent },
    { label: "Export Folder", onClick: exportFolder }
  ];

</script>

<div class="folder {isExpanded ? 'is-expanded' : ''} {isArchived ? 'is-archived' : ''}">
  <div class="header">
    <div class="expansion-wrapper" on:click={() => onToggleExpansion(folder.id || "")}>
        <div class="header-label">{folder.title}</div>
        {#if !isArchived}
            <span class="indicator">{isExpanded ? "▼" : "▶"}</span>
        {/if}
    </div>
    
    <div class="header-actions">
        <ContextualMenu items={menuItems} />
    </div>
  </div>

  {#if isExpanded}
    <div class="trades-content">
      <LoadingContainer {isLoading} size="small">
        <ul class="trades-list">
          {#each trades as trade}
            <li class="trade-item">
              <div class="trade-info">
                {#if trade.completedAt}<span class="check">✓</span>{/if}
                <a class="trade-link" href={getTradeUrl(trade.location.version, trade.location.type, trade.location.slug, trade.location.league || tradeLocationService.current.league || 'Standard')}>
                  {trade.title}
                </a>
              </div>
              <div class="trade-actions">
                  <ContextualMenu items={[
                    { label: "Edit Search Name", onClick: () => editTrade(trade) },
                    { label: "Copy URL to Clipboard", onClick: () => copyTrade(trade) },
                    { label: "Duplicate Trade", onClick: () => duplicateTrade(trade) },
                    { label: "Move Up", onClick: () => reorderTrade(trade, "up") },
                    { label: "Move Down", onClick: () => reorderTrade(trade, "down") },
                    { label: trade.completedAt ? "Uncomplete" : "Complete", onClick: () => toggleTrade(trade) },
                    { label: "Delete Trade", onClick: () => deleteTrade(trade) }
                  ]} />
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
    border: 1px solid $blue-alt;
    margin-bottom: 5px;

    &.is-archived { opacity: 0.7; }
  }

  .header {
    display: flex;
    align-items: center;
    background-color: $blue;
    padding: 5px 10px;
    color: $white;
    font-family: $primary-font;
  }

  .expansion-wrapper {
    display: flex;
    flex: 1;
    align-items: center;
    cursor: pointer;
  }

  .header-label { flex: 1; font-size: 15px; }

  .trades-list {
    list-style: none;
    padding: 0;
    margin: 0;
    background-color: rgba($black, 0.5);
  }

  .trade-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-bottom: 1px solid rgba($blue-alt, 0.3);
    
    &:hover { background-color: rgba($white, 0.05); }
  }

  .trade-link {
    color: $white;
    text-decoration: none;
    font-size: 13px;
    &:hover { text-decoration: underline; }
  }

  .check { color: $green; margin-right: 5px; }

  .footer-actions { padding: 8px; display: flex; }
</style>
