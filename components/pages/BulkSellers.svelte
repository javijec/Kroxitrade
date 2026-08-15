<script lang="ts">
  import { onMount } from "svelte";
  import layersIcon from "lucide-static/icons/layers-3.svg?raw";
  import { storageService } from "../../lib/services/storage";
  import { bulkSellers } from "../../lib/services/bulk-sellers";
  import { flashMessages } from "../../lib/services/flash";
  import { languageStore, translate } from "../../lib/services/i18n";
  import Button from "../Button.svelte";
  import EmptyState from "../EmptyState.svelte";

  const COLLAPSED_STORAGE_KEY = "bulk-sellers-collapsed";
  const VISITED_STORAGE_KEY = "bulk-sellers-visited";
  let collapsedSellers: string[] = $state([]);
  let collapsedLookup = $derived(new Set(collapsedSellers));
  let visitedItems = $state(new Set<string>());
  let visitedSellerLookup = $derived(
    new Set(
      $bulkSellers
        .filter((group) => group.items.some((item) => visitedItems.has(item.id)))
        .map((group) => group.seller)
    )
  );

  const loadCollapsedState = () => {
    const raw = storageService.getLocalValue(COLLAPSED_STORAGE_KEY);

    try {
      const parsed = raw ? JSON.parse(raw) : [];
      collapsedSellers = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
    } catch {
      collapsedSellers = [];
    }
  };

  const persistCollapsedState = () => {
    storageService.setLocalValue(COLLAPSED_STORAGE_KEY, JSON.stringify(collapsedSellers));
  };

  const loadVisitedState = () => {
    const raw = storageService.getLocalValue(VISITED_STORAGE_KEY);
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      visitedItems = new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []);
    } catch {
      visitedItems = new Set();
    }
  };

  const persistVisitedState = () => {
    storageService.setLocalValue(VISITED_STORAGE_KEY, JSON.stringify(Array.from(visitedItems)));
  };

  const toggleSeller = (seller: string) => {
    if (collapsedLookup.has(seller)) {
      collapsedSellers = collapsedSellers.filter((entry) => entry !== seller);
    } else {
      collapsedSellers = [...collapsedSellers, seller];
    }

    persistCollapsedState();
  };

  onMount(() => {
    loadCollapsedState();
    loadVisitedState();
  });

  $effect(() => {
    const validSellers = new Set($bulkSellers.map((group) => group.seller));
    const nextCollapsed = collapsedSellers.filter((seller) => validSellers.has(seller));

    if (nextCollapsed.length !== collapsedSellers.length) {
      collapsedSellers = nextCollapsed;
      persistCollapsedState();
    }
  });

  const findItem = (id: string) => {
    if (!bulkSellers.find(id)) {
      flashMessages.alert(translate($languageStore, "bulk.findError"));
    }
  };

  const buyItem = (id: string) => {
    if (!bulkSellers.buy(id)) {
      flashMessages.alert(translate($languageStore, "bulk.buyError"));
    } else {
      visitedItems = new Set([...visitedItems, id]);
      persistVisitedState();
    }
  };

  const refreshBulkSellers = () => {
    bulkSellers.refresh();
  };

  const getSellerPanelId = (seller: string) =>
    `bulk-seller-items-${seller.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`;
</script>

<div class="bulk-sellers-page">
  {#if $bulkSellers.length > 0}
    <div class="groups">
      {#each $bulkSellers as group (group.seller)}
        <section class="seller-group">
          <button
            class="seller-header"
            type="button"
            aria-expanded={!collapsedLookup.has(group.seller)}
            aria-controls={getSellerPanelId(group.seller)}
            onclick={() => toggleSeller(group.seller)}>
            <div class="seller-header-main">
              <span class="seller-caret" aria-hidden="true">{collapsedLookup.has(group.seller) ? "▶" : "▼"}</span>
              <div class="seller-name">{group.seller}</div>
            </div>
            <div class="seller-header-meta">
              {#if visitedSellerLookup.has(group.seller)}
                <span class="visited-badge">{translate($languageStore, "bulk.visited")}</span>
              {/if}
              <div class="seller-count">({group.total})</div>
            </div>
          </button>

          {#if !collapsedLookup.has(group.seller)}
            <div class="seller-items" id={getSellerPanelId(group.seller)}>
              {#each group.items as item (item.id)}
                <div class="seller-item" title={item.itemName} aria-label={`${item.itemName}: ${item.priceLabel}`}>
                  <div class="item-price">
                    <span class="price-prefix">{translate($languageStore, "bulk.price")}</span>
                    {#if item.priceAmount}
                      <span class="price-amount">{item.priceAmount}</span>
                    {/if}

                    {#if item.currencyIconUrl}
                      <img
                        class="currency-icon"
                        src={item.currencyIconUrl}
                        alt={item.currencyIconAlt || item.priceLabel}
                        title={item.priceLabel}
                      />
                    {:else}
                      <span class="price-fallback">{item.priceLabel}</span>
                    {/if}
                  </div>

                  <div class="item-actions">
                    <Button label={translate($languageStore, "bulk.find")} theme="blue" onClick={() => findItem(item.id)} />
                    <Button label={translate($languageStore, "bulk.buy")} theme="gold" onClick={() => buyItem(item.id)} />
                    {#if visitedItems.has(item.id)}
                      <span class="visited-badge">{translate($languageStore, "bulk.visited")}</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/each}
    </div>
  {:else}
    <EmptyState
      iconHtml={layersIcon}
      eyebrow={translate($languageStore, "layout.nav.bulk")}
      title={translate($languageStore, "bulk.emptyTitle")}
      description={translate($languageStore, "bulk.empty")}
      actionLabel={translate($languageStore, "bulk.refresh")}
      onAction={refreshBulkSellers}
    />
  {/if}
</div>

<style>
.bulk-sellers-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  font-family: "FontinSmallcaps", serif;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.seller-group {
  border: 1px solid rgba(163, 141, 109, 0.14);
  background: rgba(5, 5, 5, 0.34);
  border-radius: 4px;
  overflow: hidden;
}

.seller-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: rgba(238, 238, 238, 0.03);
  border: 0;
  border-bottom: 1px solid rgba(238, 238, 238, 0.06);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.seller-header-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.seller-header:hover {
  background: rgba(238, 238, 238, 0.05);
}

.seller-header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.seller-caret {
  color: rgba(238, 238, 238, 0.66);
  font-size: calc(10px * var(--bt-text-scale, 1));
  flex: 0 0 auto;
}

.seller-name {
  font-family: "FontinSmallcaps", serif;
  color: #c4b18c;
  font-size: calc(13px * var(--bt-text-scale, 1));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seller-count {
  color: rgba(238, 238, 238, 0.72);
  font-family: "FontinSmallcaps", serif;
  font-size: calc(12px * var(--bt-text-scale, 1));
  flex: 0 0 auto;
}

.seller-items {
  display: flex;
  flex-direction: column;
}

.seller-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-top: 1px solid rgba(238, 238, 238, 0.05);
  min-width: 0;
}

.seller-item:first-child {
  border-top: 0;
}

.item-price {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: calc(12px * var(--bt-text-scale, 1));
  white-space: nowrap;
}

.price-prefix {
  color: rgba(238, 238, 238, 0.9);
  font-family: "FontinSmallcaps", serif;
  font-weight: 600;
}

.price-amount {
  color: #ffff77;
  font-family: "FontinSmallcaps", serif;
  font-weight: 700;
}

.currency-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  vertical-align: middle;
}

.price-fallback {
  color: #ffff77;
  font-family: "FontinSmallcaps", serif;
}

.item-actions {
  display: flex;
  gap: 6px;
  flex: 0 0 auto;
  align-items: center;
  flex-wrap: nowrap;
}

.item-actions :global(.button) {
  min-width: 58px;
  height: 24px;
  padding: 0 10px;
  font-size: calc(10px * var(--bt-text-scale, 1));
  white-space: nowrap;
}

.visited-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  height: 20px;
  background: rgba(30, 77, 30, 0.15);
  border: 1px solid rgba(30, 77, 30, 0.4);
  border-radius: 2px;
  color: #1e4d1e;
  font-family: "FontinSmallcaps", serif;
  font-size: calc(9px * var(--bt-text-scale, 1));
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

.visited-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  height: 28px;
  background: rgba(30, 77, 30, 0.15);
  border: 1px solid rgba(30, 77, 30, 0.4);
  border-radius: 2px;
  color: #1e4d1e;
  font-family: "FontinSmallcaps", serif;
  font-size: calc(10px * var(--bt-text-scale, 1));
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

@container (max-width: 359px) {
  .seller-item {
    gap: 6px;
  }
}
</style>
