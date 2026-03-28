<script lang="ts">
  import { onMount } from "svelte";
  import { storageService } from "../../lib/services/storage";
  import { bulkSellersService } from "../../lib/services/bulk-sellers";
  import { flashMessages } from "../../lib/services/flash";
  import AlertMessage from "../AlertMessage.svelte";
  import Button from "../Button.svelte";

  const COLLAPSED_STORAGE_KEY = "bulk-sellers-collapsed";
  const bulkSellers = bulkSellersService;
  let collapsedSellers: string[] = [];
  let collapsedLookup = new Set<string>();

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
  });

  $: collapsedLookup = new Set(collapsedSellers);

  $: {
    const validSellers = new Set($bulkSellers.map((group) => group.seller));
    const nextCollapsed = collapsedSellers.filter((seller) => validSellers.has(seller));

    if (nextCollapsed.length !== collapsedSellers.length) {
      collapsedSellers = nextCollapsed;
      persistCollapsedState();
    }
  }

  const findItem = (id: string) => {
    if (!bulkSellersService.find(id)) {
      flashMessages.alert("Couldn't locate that listing in the current results.");
    }
  };

  const buyItem = (id: string) => {
    if (!bulkSellersService.buy(id)) {
      flashMessages.alert("Couldn't trigger the buy action for that listing.");
    }
  };
</script>

<div class="bulk-sellers-page">
  {#if $bulkSellers.length > 0}
    <div class="groups">
      {#each $bulkSellers as group (group.seller)}
        <section class="seller-group">
          <button class="seller-header" type="button" on:click={() => toggleSeller(group.seller)}>
            <div class="seller-header-main">
              <span class="seller-caret">{collapsedLookup.has(group.seller) ? "▶" : "▼"}</span>
              <div class="seller-name">{group.seller}</div>
            </div>
            <div class="seller-count">({group.total})</div>
          </button>

          {#if !collapsedLookup.has(group.seller)}
            <div class="seller-items">
              {#each group.items as item (item.id)}
                <div class="seller-item">
                  <div class="item-text">
                    <div class="item-name" title={item.itemName}>{item.itemName}</div>
                    <div class="item-price">
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
                  </div>

                  <div class="item-actions">
                    <Button label="Find" theme="blue" onClick={() => findItem(item.id)} />
                    <Button label="Buy" theme="gold" onClick={() => buyItem(item.id)} />
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/each}
    </div>
  {:else}
    <AlertMessage
      type="warning"
      message="No bulk sellers detected yet. Open a trade result list where the same seller appears more than once."
    />
  {/if}
</div>

<style lang="scss">
  @use "../../lib/styles/variables" as *;

  .bulk-sellers-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .groups {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .seller-group {
    border: 1px solid rgba($gold, 0.14);
    background: rgba($black, 0.34);
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
    background: rgba($white, 0.03);
    border: 0;
    border-bottom: 1px solid rgba($white, 0.06);
    color: inherit;
    cursor: pointer;
    text-align: left;
  }

  .seller-header:hover {
    background: rgba($white, 0.05);
  }

  .seller-header-main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .seller-caret {
    color: rgba($white, 0.66);
    font-size: 10px;
    flex: 0 0 auto;
  }

  .seller-name {
    font-family: $primary-font;
    color: $gold-alt;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .seller-count {
    color: rgba($white, 0.72);
    font-family: $primary-font;
    font-size: 12px;
    flex: 0 0 auto;
  }

  .seller-items {
    display: flex;
    flex-direction: column;
  }

  .seller-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border-top: 1px solid rgba($white, 0.05);
  }

  .seller-item:first-child {
    border-top: 0;
  }

  .item-text {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-width: 0;
  }

  .item-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba($white, 0.88);
    font-size: 12px;
  }

  .item-price {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    white-space: nowrap;
  }

  .price-amount {
    color: $poe-rare;
    font-family: $primary-font;
  }

  .currency-icon {
    width: 16px;
    height: 16px;
    object-fit: contain;
    vertical-align: middle;
  }

  .price-fallback {
    color: $poe-rare;
    font-family: $primary-font;
  }

  .item-actions {
    display: flex;
    gap: 6px;
    flex: 0 0 auto;
  }

  .item-actions :global(.button) {
    min-width: 64px;
    padding: 0 10px;
  }

  @container (max-width: 359px) {
    .seller-item {
      grid-template-columns: 1fr;
    }

    .item-text {
      grid-template-columns: 1fr;
      gap: 4px;
    }

    .item-actions {
      justify-content: flex-start;
    }
  }
</style>
