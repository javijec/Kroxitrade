<script lang="ts">
  const listModifiers = [
    {
      name: 'Pseudo Res/Life',
      types: ['life', 'cold', 'fire', 'light', 'chaos'],
      prefix: 'pseudo.pseudo_',
    },
    {
      name: 'Explicit Res/Life',
      types: ['explicit_life', 'explicit_cold', 'explicit_fire', 'explicit_light', 'explicit_chaos'],
      prefix: 'explicit.stat_',
    },
    {
      name: 'Attack Weapon',
      types: [
        'explicit_inc_phy_dmg', 'explicit_add_phy_local', 'explicit_add_fire_local',
        'explicit_add_cold_local', 'explicit_add_light_local', 'explicit_add_chaos_local',
        'explicit_inc_attack_speed_local', 'explicit_inc_crit_chance', 'explicit_global_crit_mult'
      ],
      prefix: 'explicit.stat_',
    },
    {
      name: 'Spell Weapon',
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

  let collapsed = true; // start collapsed

  function handleAction(action: 'global-plus' | 'global-minus', types: string[], prefix: string) {
    document.dispatchEvent(new CustomEvent('krox-finer-action', {
      detail: {
        action,
        types: types.join(','),
        prefix
      }
    }));
  }
</script>

<div class="finer-filters-container">
  <!-- Header -->
  <div class="finer-header" on:click={() => collapsed = !collapsed}>
    <span>ADD TO FILTERS</span>
    <span class="chevron" class:collapsed>▼</span>
  </div>

  {#if !collapsed}
    <div class="finer-body">
      <div class="section-title">- MODIFIERS -</div>
      
      <div class="modifiers-list">
        {#each listModifiers as mod}
          <div class="finer-global-btn">
            <span class="mod-name">{mod.name}</span>
            <button class="action-btn minus" on:click={() => handleAction('global-minus', mod.types, mod.prefix)}>-</button>
            <button class="action-btn plus" on:click={() => handleAction('global-plus', mod.types, mod.prefix)}>+</button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  @use "../lib/styles/variables" as *;

  .finer-filters-container {
    width: 100%;
    background-color: rgba($black, 0.4);
    border-top: 1px solid rgba($gold, 0.1);
    display: flex;
    flex-direction: column;
    margin-top: auto;
  }

  .finer-header {
    background: linear-gradient(180deg, rgba($gold, 0.08), transparent);
    padding: 10px 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
    border-bottom: 1px solid rgba($gold, 0.05);

    span {
      color: $gold;
      font-size: 11px;
      font-family: $primary-font;
      letter-spacing: 0.1em;
      font-weight: bold;
    }

    .chevron {
      font-size: 10px;
      transition: transform 0.2s;
      &.collapsed {
        transform: rotate(-90deg);
      }
    }
    
    &:hover {
      background: linear-gradient(180deg, rgba($gold, 0.12), rgba($gold, 0.02));
    }
  }

  .finer-body {
    padding: 15px;
    display: flex;
    flex-direction: column;
    max-height: 250px;
    overflow-y: auto;
  }

  .section-title {
    color: rgba($white, 0.6);
    font-size: 10px;
    font-family: $primary-font;
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
    background: rgba($white, 0.02);
    border: 1px solid rgba($white, 0.05);
    border-radius: 4px;
    padding: 2px 4px;
  }

  .mod-name {
    grid-area: name;
    display: flex;
    align-items: center;
    color: $white;
    font-size: 11px;
    font-family: $primary-font;
    padding-left: 2px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    color: $white;
    font-size: 14px;
    border-radius: 2px;
    cursor: pointer;
    padding: 2px 0;

    &.minus {
      grid-area: minus;
      background: rgba(220, 53, 69, 0.3);
      &:hover { background: rgba(220, 53, 69, 0.5); }
    }

    &.plus {
      grid-area: plus;
      background: rgba(40, 167, 69, 0.3);
      &:hover { background: rgba(40, 167, 69, 0.5); }
    }
  }
</style>
