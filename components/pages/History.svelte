<script lang="ts">
  import { onMount } from "svelte";
  import { tradeLocationService } from "../../lib/services/trade-location";
  import { flashMessages } from "../../lib/services/flash";
  import { getTradeUrl } from "../../lib/utilities/trade-url";
  import type { TradeLocationHistoryStruct } from "../../lib/types/trade-location";

  import Button from "../Button.svelte";
  import LoadingContainer from "../LoadingContainer.svelte";
  import AlertMessage from "../AlertMessage.svelte";

  let historyEntries: TradeLocationHistoryStruct[] = [];
  let isLoading = false;

  onMount(async () => {
    await fetchHistory();
    const unsubscribe = tradeLocationService.onChange(() => void fetchHistory());
    return unsubscribe;
  });

  const fetchHistory = async () => {
    isLoading = true;
    historyEntries = await tradeLocationService.fetchHistory();
    isLoading = false;
  };

  const clearHistory = async () => {
    await tradeLocationService.clearHistoryEntries();
    historyEntries = [];
    flashMessages.success("History cleared!");
  };
</script>

<div class="history-page">
  <LoadingContainer {isLoading} size="large">
    {#if historyEntries.length > 0}
      <ul class="history-list">
        {#each historyEntries as entry (entry.id)}
          <li class="history-item">
            <a 
                class="history-link" 
                href={getTradeUrl(entry.version, entry.type, entry.slug, entry.league || 'Standard')}
            >
              <div class="history-title">{entry.title}</div>
              <div class="history-meta">{entry.league} • {new Date(entry.createdAt).toLocaleString()}</div>
            </a>
          </li>
        {/each}
      </ul>

      <Button 
          label="Clear History" 
          theme="gold" 
          icon="✕" 
          onClick={clearHistory} 
          class="clear-button"
      />
    {:else}
      <AlertMessage type="warning" message="History is empty." />
    {/if}
  </LoadingContainer>
</div>

<style lang="scss">
  @use "../../lib/styles/variables" as *;

  .history-list {
    width: 100%;
    min-width: 0;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .history-item {
    border-bottom: 1px solid rgba($blue-alt, 0.3);
    &:hover { background-color: rgba($white, 0.05); }
  }

  .history-link {
    display: block;
    padding: 10px;
    color: $white;
    text-decoration: none;
    overflow: hidden;
  }

  .history-title { font-size: 14px; font-weight: bold; overflow-wrap: anywhere; }
  .history-meta { font-size: 11px; color: rgba($white, 0.6); margin-top: 3px; overflow-wrap: anywhere; }

  :global(.clear-button) { width: 100%; margin-top: 15px; }
</style>
