<script lang="ts">
  import { onMount } from "svelte";
  import { tradeLocationService } from "../../lib/services/trade-location";
  import { openUrlInActiveTab } from "../../lib/services/active-trade-tab";
  import { flashMessages } from "../../lib/services/flash";
  import { languageStore, translate } from "../../lib/services/i18n";
  import { getTradeUrl } from "../../lib/utilities/trade-url";
  import type { TradeLocationHistoryStruct, TradeSiteVersion } from "../../lib/types/trade-location";

  import Button from "../Button.svelte";
  import LoadingContainer from "../LoadingContainer.svelte";
  import AlertMessage from "../AlertMessage.svelte";

  type HistoryGroup = {
    id: string;
    label: string;
    entries: TradeLocationHistoryStruct[];
  };

  let historyEntries: TradeLocationHistoryStruct[] = [];
  let filteredEntries: TradeLocationHistoryStruct[] = [];
  let groupedEntries: HistoryGroup[] = [];
  let isLoading = false;
  let currentVersion: TradeSiteVersion = "1";

  onMount(() => {
    const unsubscribeLocation = tradeLocationService.locationStore.subscribe((loc) => {
      currentVersion = loc.version;
      applyFilter();
    });

    void fetchHistory();
    const unsubscribeHistory = tradeLocationService.onChange(() => void fetchHistory());

    return () => {
      unsubscribeLocation();
      unsubscribeHistory();
    };
  });

  const fetchHistory = async () => {
    isLoading = true;
    historyEntries = await tradeLocationService.fetchHistory();
    applyFilter();
    isLoading = false;
  };

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const getGroupLabel = (date: Date) => {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const entryDay = startOfDay(date);
    const diffDays = Math.round((today.getTime() - entryDay.getTime()) / 86400000);

    if (diffDays === 0) {
      return { id: "today", label: translate($languageStore, "history.today") };
    }

    if (diffDays === 1) {
      return { id: "yesterday", label: translate($languageStore, "history.yesterday") };
    }

    if (diffDays < 7) {
      return {
        id: `weekday-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        label: new Intl.DateTimeFormat($languageStore, { weekday: "long" }).format(date)
      };
    }

    return {
      id: `month-${date.getFullYear()}-${date.getMonth()}`,
      label: new Intl.DateTimeFormat($languageStore, {
        month: "long",
        year: "numeric"
      }).format(date)
    };
  };

  const formatRelativeTime = (createdAt: string) => {
    const now = Date.now();
    const target = new Date(createdAt).getTime();
    const diffMinutes = Math.round((target - now) / 60000);
    const rtf = new Intl.RelativeTimeFormat($languageStore, { numeric: "auto" });

    const absMinutes = Math.abs(diffMinutes);
    if (absMinutes < 60) {
      return rtf.format(diffMinutes, "minute");
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, "hour");
    }

    const diffDays = Math.round(diffHours / 24);
    return rtf.format(diffDays, "day");
  };

  const groupHistoryEntries = (entries: TradeLocationHistoryStruct[]) => {
    const groups: HistoryGroup[] = [];
    const groupedMap = new Map<string, HistoryGroup>();

    for (const entry of entries) {
      const date = new Date(entry.createdAt);
      const groupMeta = getGroupLabel(date);
      const existing = groupedMap.get(groupMeta.id);

      if (existing) {
        existing.entries.push(entry);
        continue;
      }

      const nextGroup = {
        id: groupMeta.id,
        label: groupMeta.label,
        entries: [entry]
      };

      groupedMap.set(groupMeta.id, nextGroup);
      groups.push(nextGroup);
    }

    groupedEntries = groups;
  };

  const applyFilter = () => {
    filteredEntries = historyEntries
      .filter((entry) => entry.version === currentVersion)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    groupHistoryEntries(filteredEntries);
  };

  const clearHistory = async () => {
    await tradeLocationService.clearHistoryEntries();
    historyEntries = [];
    applyFilter();
    flashMessages.success(translate($languageStore, "history.cleared"));
  };

  const openHistoryEntry = async (entry: TradeLocationHistoryStruct) => {
    await openUrlInActiveTab(
      getTradeUrl(entry.version, entry.type, entry.slug, entry.league || "Standard")
    );
  };
</script>

<div class="history-page">
  <LoadingContainer {isLoading} size="large">
    {#if groupedEntries.length > 0}
      <div class="history-groups">
        {#each groupedEntries as group (group.id)}
          <section class="history-group">
            <header class="history-group__header">
              <h3>{group.label}</h3>
            </header>

            <ul class="history-list">
              {#each group.entries as entry (entry.id)}
                <li class="history-item">
                  <a
                    class="history-link"
                    href={getTradeUrl(entry.version, entry.type, entry.slug, entry.league || "Standard")}
                    on:click|preventDefault={() => void openHistoryEntry(entry)}
                  >
                    <div class="history-link__topline">
                      <span class="history-league">{entry.league}</span>
                      <span class="history-relative">{formatRelativeTime(entry.createdAt)}</span>
                    </div>

                    <div class="history-title">{entry.title}</div>

                    <div class="history-meta">
                      {new Intl.DateTimeFormat($languageStore, {
                        dateStyle: "medium",
                        timeStyle: "short"
                      }).format(new Date(entry.createdAt))}
                    </div>
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>

      <Button
        label={translate($languageStore, "history.clear")}
        theme="gold"
        icon="✕"
        onClick={clearHistory}
        class="clear-button"
      />
    {:else}
      <AlertMessage type="warning" message={translate($languageStore, "history.empty", { version: currentVersion })} />
    {/if}
  </LoadingContainer>
</div>

<style lang="scss">
  @use "../../lib/styles/variables" as *;

  .history-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 100%;
  }

  .history-groups {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .history-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .history-group__header h3 {
    margin: 0;
    color: rgba($gold, 0.92);
    font-family: $primary-font;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .history-list {
    width: 100%;
    min-width: 0;
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .history-item {
    border: 1px solid rgba($white, 0.07);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba($white, 0.03), rgba($white, 0.015)),
      rgba($white, 0.02);
    overflow: hidden;

    &:hover {
      border-color: rgba($gold, 0.18);
      background:
        linear-gradient(180deg, rgba($gold, 0.06), rgba($gold, 0.02)),
        rgba($white, 0.03);
    }
  }

  .history-link {
    display: block;
    padding: 12px;
    color: $white;
    text-decoration: none;
    overflow: hidden;

    &:focus-visible {
      background: rgba($gold, 0.08);
      box-shadow: inset 0 0 0 1px rgba($gold, 0.24);
    }
  }

  .history-link__topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .history-league {
    display: inline-flex;
    align-items: center;
    min-height: 20px;
    padding: 0 8px;
    border: 1px solid rgba($gold, 0.18);
    border-radius: 999px;
    background: rgba($gold, 0.08);
    color: rgba($gold-alt, 0.92);
    font-family: $primary-font;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .history-relative {
    color: rgba($white, 0.52);
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .history-title {
    font-size: 13px;
    font-weight: 700;
    line-height: 1.45;
    color: rgba($white, 0.94);
    overflow-wrap: anywhere;
  }

  .history-meta {
    margin-top: 6px;
    font-size: 11px;
    color: rgba($white, 0.62);
    overflow-wrap: anywhere;
  }

  :global(.clear-button) {
    width: 100%;
    margin-top: 2px;
  }
</style>
