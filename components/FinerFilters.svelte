<script lang="ts">
  import { languageStore, translate } from "../lib/services/i18n";
  import { extensionBus } from "../lib/core/extension-bus";
  import {
    BUYOUT_CURRENCY_PRESETS,
    clearBuyoutPrice,
    setBuyoutCurrencyPreset
  } from "../lib/utilities/buyout-currency";
  const listModifiers = [
    {
      key: 'finer.pseudoResLife',
      types: ['life', 'cold', 'fire', 'light', 'chaos'],
      prefix: 'pseudo.pseudo_',
    },
    {
      key: 'finer.explicitResLife',
      types: ['explicit_life', 'explicit_cold', 'explicit_fire', 'explicit_light', 'explicit_chaos'],
      prefix: 'explicit.stat_',
    },
    {
      key: 'finer.attackWeapon',
      types: [
        'explicit_inc_phy_dmg', 'explicit_add_phy_local', 'explicit_add_fire_local',
        'explicit_add_cold_local', 'explicit_add_light_local', 'explicit_add_chaos_local',
        'explicit_inc_attack_speed_local', 'explicit_inc_crit_chance', 'explicit_global_crit_mult'
      ],
      prefix: 'explicit.stat_',
    },
    {
      key: 'finer.spellWeapon',
      types: [
        'explicit_inc_spell_dmg', 'explicit_inc_fire_spell_dmg', 'explicit_inc_cold_spell_dmg',
        'explicit_inc_light_spell_dmg', 'explicit_add_fire_spell_dmg', 'explicit_add_cold_spell_dmg',
        'explicit_add_light_spell_dmg', 'explicit_gain_extra_fire_damage', 'explicit_gain_extra_cold_damage',
        'explicit_gain_extra_light_damage', 'explicit_level_all_spells', 'explicit_level_all_fire_spells',
        'explicit_level_all_cold_spells', 'explicit_level_all_light_spells', 'explicit_level_all_physical_spells',
        'explicit_level_all_chaos_spells', 'explicit_inc_cast_speed', 'explicit_global_crit_mult'
      ],
      prefix: 'explicit.stat_',
    }
  ];

  let collapsed = $state(true); // start collapsed

  function handleAction(action: 'global-plus' | 'global-minus', types: string[], prefix: string) {
    extensionBus.send("finer-filters:action", {
      action,
      types: types.join(','),
      prefix
    });
  }

  function handleBuyoutCurrency(currency: string) {
    setBuyoutCurrencyPreset(currency);
  }

  function handleClearBuyoutPrice() {
    clearBuyoutPrice();
  }
</script>

<div class="finer-filters-container">
  <!-- Header -->
  <button
    type="button"
    class="finer-header"
    aria-expanded={!collapsed}
    onclick={() => collapsed = !collapsed}>
    <span>{translate($languageStore, "finer.title")}</span>
    <span class="chevron" class:collapsed>▼</span>
  </button>

  {#if !collapsed}
    <div class="finer-body">
      <div class="section-title">- {translate($languageStore, "finer.modifiers")} -</div>
      
      <div class="modifiers-list">
        {#each listModifiers as mod}
          <div class="finer-global-btn">
            <span class="mod-name">{translate($languageStore, mod.key)}</span>
            <button class="action-btn minus" onclick={() => handleAction('global-minus', mod.types, mod.prefix)}>-</button>
            <button class="action-btn plus" onclick={() => handleAction('global-plus', mod.types, mod.prefix)}>+</button>
          </div>
        {/each}
      </div>

      <div class="section-title buyout-title">- {translate($languageStore, "finer.buyoutPrice")} -</div>
      <div class="buyout-controls">
        {#each BUYOUT_CURRENCY_PRESETS as preset}
          <button
            type="button"
            class="action-btn buyout"
            title={preset.currency}
            onclick={() => handleBuyoutCurrency(preset.currency)}>
            {preset.label}
          </button>
        {/each}
        <button
          type="button"
          class="action-btn buyout-clear"
          onclick={handleClearBuyoutPrice}>
          {translate($languageStore, "finer.clearBuyoutPrice")}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
.finer-filters-container {
  width: 100%;
  background-color: rgba(5, 5, 5, 0.4);
  border-top: 1px solid rgba(163, 141, 109, 0.1);
  display: flex;
  flex-direction: column;
  margin-top: auto;
}

.finer-header {
  border: none;
  width: 100%;
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.08), transparent);
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid rgba(163, 141, 109, 0.05);
  text-align: left;
}
.finer-header span {
  color: #a38d6d;
  font-size: calc(11px * var(--bt-text-scale, 1));
  font-family: "FontinSmallcaps", serif;
  letter-spacing: 0.1em;
  font-weight: bold;
}
.finer-header .chevron {
  font-size: calc(10px * var(--bt-text-scale, 1));
  transition: transform 0.2s;
}
.finer-header .chevron.collapsed {
  transform: rotate(-90deg);
}
.finer-header:hover {
  background: linear-gradient(180deg, rgba(163, 141, 109, 0.12), rgba(163, 141, 109, 0.02));
}

.finer-body {
  padding: 15px;
  display: flex;
  flex-direction: column;
  max-height: 250px;
  overflow-y: auto;
}

.section-title {
  color: rgba(238, 238, 238, 0.6);
  font-size: calc(10px * var(--bt-text-scale, 1));
  font-family: "FontinSmallcaps", serif;
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.05em;
}

.modifiers-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.finer-global-btn {
  display: grid;
  grid-template-areas: "name minus plus";
  grid-template-columns: 1fr 24px 24px;
  grid-gap: 4px;
  background: rgba(238, 238, 238, 0.02);
  border: 1px solid rgba(238, 238, 238, 0.05);
  border-radius: 4px;
  padding: 2px 4px;
}

.buyout-controls {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  margin-top: 2px;
}

.mod-name {
  grid-area: name;
  display: flex;
  align-items: center;
  color: #eeeeee;
  font-size: calc(11px * var(--bt-text-scale, 1));
  font-family: "FontinSmallcaps", serif;
  padding-left: 2px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  color: #eeeeee;
  font-size: calc(14px * var(--bt-text-scale, 1));
  border-radius: 2px;
  cursor: pointer;
  padding: 2px 0;
}
.action-btn.minus {
  grid-area: minus;
  background: rgba(220, 53, 69, 0.3);
}
.action-btn.minus:hover {
  background: rgba(220, 53, 69, 0.5);
}
.action-btn.plus {
  grid-area: plus;
  background: rgba(40, 167, 69, 0.3);
}
.action-btn.plus:hover {
  background: rgba(40, 167, 69, 0.5);
}
.action-btn.buyout {
  background: rgba(163, 141, 109, 0.18);
}
.action-btn.buyout:hover {
  background: rgba(163, 141, 109, 0.28);
}
.action-btn.buyout-clear {
  background: rgba(220, 53, 69, 0.3);
}
.action-btn.buyout-clear:hover {
  background: rgba(220, 53, 69, 0.5);
}
</style>
