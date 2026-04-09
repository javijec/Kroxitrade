import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.pathofexile.com/trade*"],
  world: "MAIN"
}

console.log("[Krox-MainWorld] Script injected and running!");

if (!(window as any).__KROX_STARTED__) {
  console.log("[Krox-MainWorld] Starting Finer Filters initialization...");
  (window as any).__KROX_STARTED__ = true;

  // ---------- helpers ----------
  const $ = (sel: string, root = document) => root.querySelector(sel);
  const $$ = (sel: string, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (type: string, selector: string, handler: Function, opts?: any) => {
    document.addEventListener(type, (e: any) => {
      const el = e.target.closest(selector);
      if (!el) return;
      handler.call(el, e, el);
    }, opts);
  };
  const onEnter = (selector: string, handler: Function) => {
    document.addEventListener('mouseover', (e: any) => {
      const el = e.target.closest(selector);
      if (!el) return;
      const rt = e.relatedTarget;
      if (rt && (rt === el || el.contains(rt))) return;
      handler.call(el, e, el);
    });
  };
  const onLeave = (selector: string, handler: Function) => {
    document.addEventListener('mouseout', (e: any) => {
      const el = e.target.closest(selector);
      if (!el) return;
      const rt = e.relatedTarget;
      if (rt && (rt === el || el.contains(rt))) return;
      handler.call(el, e, el);
    });
  };
  const h = (html: string) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  const listModifiers = [];
  listModifiers.push({
    name: 'Pseudo Res/Life',
    types: ['life', 'cold', 'fire', 'light', 'chaos'],
    prefix: 'pseudo.pseudo_',
  });
  listModifiers.push({
    name: 'Explicit Res/Life',
    types: ['explicit_life', 'explicit_cold', 'explicit_fire', 'explicit_light', 'explicit_chaos'],
    prefix: 'explicit.stat_',
  });
  listModifiers.push({
    name: 'Attack Weapon',
    types: [
      'explicit_inc_phy_dmg',
      'explicit_add_phy_local',
      'explicit_add_fire_local',
      'explicit_add_cold_local',
      'explicit_add_light_local',
      'explicit_add_chaos_local',
      'explicit_inc_attack_speed_local',
      'explicit_inc_crit_chance',
      'explicit_global_crit_mult',
    ],
    prefix: 'explicit.stat_',
  });
  listModifiers.push({
    name: 'Spell Weapon',
    types: [
      'explicit_inc_spell_dmg',
      'explicit_inc_fire_spell_dmg',
      'explicit_inc_cold_spell_dmg',
      'explicit_inc_light_spell_dmg',
      'explicit_add_fire_spell_dmg',
      'explicit_add_cold_spell_dmg',
      'explicit_add_light_spell_dmg',
      'explicit_gain_extra_fire_damage',
      'explicit_gain_extra_cold_damage',
      'explicit_gain_extra_light_damage',
      'explicit_level_all_spells',
      'explicit_level_all_fire_spells',
      'explicit_level_all_cold_spells',
      'explicit_level_all_light_spells',
      'explicit_level_all_physical_spells',
      'explicit_level_all_chaos_spells',
      'explicit_inc_cast_speed',
      'explicit_global_crit_mult'
    ],
    prefix: 'explicit.stat_',
  });



  // ---------- overlay/button templates ----------
  const filteredOverlay = () => h(`<div class="finer-filtered-overlay"></div>`);
  const buttonsTemplate = () => h(`
    <span class="lc l" id="btns-finer">
      <span class="btn-finer add" data-action="add-filter"  title="add this mod to your search filters">+</span>
      <span class="btn-finer rm"  data-action="rmv-filter"  title="remove this mod from your search results">-</span>
    </span>`);

  // ---------- map ----------
  const modMap: Record<string, string> = {
    life:"total_life",
    cold:"total_cold_resistance",
    fire:"total_fire_resistance",
    light:"total_lightning_resistance",
    chaos:"total_chaos_resistance",
    move:"increased_movement_speed",
    allR:"total_elemental_resistance",
    explicit_life:"3299347043",
    explicit_cold:"4220027924",
    explicit_fire:"3372524247",
    explicit_light:"1671376347",
    explicit_chaos:"2923486259",
    explicit_inc_phy_dmg:"1509134228",
    explicit_add_phy_local:"1940865751",
    explicit_add_fire_local:"709508406",
    explicit_add_cold_local:"1037193709",
    explicit_add_light_local:"3336890334",
    explicit_add_chaos_local:"2223678961",
    explicit_inc_attack_speed_local:"210067635",
    explicit_inc_crit_chance:"2375316951",
    explicit_global_crit_mult:"3556824919",
    explicit_inc_spell_dmg:"2974417149",
    explicit_inc_fire_spell_dmg:"3962278098",
    explicit_inc_cold_spell_dmg:"3291658075",
    explicit_inc_light_spell_dmg:"2231156303",
    explicit_add_fire_spell_dmg:"1133016593",
    explicit_add_cold_spell_dmg:"2469416729",
    explicit_add_light_spell_dmg:"2831165374",
    explicit_level_all_spells:"124131830",
    explicit_level_all_fire_spells:"591105508",
    explicit_level_all_cold_spells:"2254480358",
    explicit_level_all_light_spells:"1545858329",
    explicit_level_all_physical_spells:"4226189338",
    explicit_level_all_chaos_spells:"2891184298",
    explicit_inc_cast_speed:"737908626",
    explicit_gain_extra_fire_damage:"3015669065",
    explicit_gain_extra_cold_damage:"2505884597",
    explicit_gain_extra_light_damage:"3278136794",
  };
  const createFilter = (id: string) => id && ({ id, value:{}, disabled:false });

  const finder = (vm: any, v: string) => vm?.$vnode?.tag?.includes?.(v);
  const getApp = () => (window as any).app;
  const findVueItem = (tags: string[]) => tags.reduce((acc, v) => acc?.$children?.find?.((e: any) => finder(e, v)), getApp());
  const ItemResultPanelVueItem = () => findVueItem(["item-results-panel"]);
  const findVueResultItem = (_itemId: string) => findVueItem(["item-results-panel","resultset"])?.$children?.find?.((e: any) => e.itemId === _itemId);
  const ItemSearchGroupsVueItems = (_type?: string) => {
    const panel = findVueItem(["item-search-panel","item-filter-panel"]);
    return panel?.$children?.filter?.((e: any) => finder(e,"stat-filter-group") && (_type ? e.group.type === _type : true)) || [];
  };

  // step 1: hover a result row -> check filters
  onEnter('.resultset > .row, .resultset > .result-item, .search-results .result-item, .search-results .row', (e: any, row: HTMLElement) => {
    if (row.classList.contains('finer-processed')) return;
    
    // Check if the vue app exists
    if (!getApp()) {
      console.warn("[Krox-MainWorld] Vue 'window.app' not found. Is this PoE 2 Trade?");
    }

    const rowid = row.getAttribute('data-id') || row.id;
    // Broaden the modifier query selector to support new classes
    const mods = Array.from(row.querySelectorAll('.content [class*="Mod"], .item-stats .stat-line')) as HTMLElement[];
    const ISGs = ItemSearchGroupsVueItems();

    console.debug(`[Krox-MainWorld] Hovered Row -> Found ${mods.length} modifier elements`);

    mods.forEach((mod) => {
      const sEl = mod.querySelector('.lc.s') as HTMLElement;
      let fieldVal = sEl?.dataset?.field || sEl?.getAttribute('data-field') || '';
      
      const modHash = fieldVal.startsWith('stat.') ? fieldVal.slice(5) : fieldVal; 
      if (!modHash) return;
      
      mod.dataset.hash = modHash;
      if (rowid) mod.dataset.rowid = rowid;

      const isInFilters = ISGs.some((isg: any) => isg.filters && isg.filters.some((f: any) => f.id === modHash));
      if (isInFilters) {
        mod.classList.add('finer-filtered');
        const overlay = filteredOverlay();
        if (overlay) mod.appendChild(overlay);
      } else {
        mod.classList.add('finer-filterable');
      }
    });

    row.classList.add('finer-processed');
  });

  // step 2: hover a mod -> add/remove finer filter buttons
  onEnter('.itemBoxContent > .content > div, .content [class*="Mod"], .item-stats .stat-line', (e: any, el: HTMLElement) => {
    if (!el.classList.contains('finer-filterable') && !el.classList.contains('finer-filtered')) return;
    if (el.querySelector('#btns-finer')) return;
    console.debug("[Krox-MainWorld] Attaching hover buttons to modifier:", el);
    const btns = buttonsTemplate();
    if (btns) el.appendChild(btns);
  });
  onLeave('.itemBoxContent > .content > div, .content [class*="Mod"], .item-stats .stat-line', (e: any, el: HTMLElement) => {
    const btns = el.querySelector('#btns-finer');
    if (btns) btns.remove();
  });

  // step 3: click ± inside the hover buttons
  on('click', '[data-action="add-filter"]', (e: any, el: HTMLElement) => {
    addOrRemoveFilter(e, true, el);
  });
  on('click', '[data-action="rmv-filter"]', (e: any, el: HTMLElement) => {
    addOrRemoveFilter(e, false, el);
  });

  // listener for actions dispatched from the Svelte sidebar
  document.addEventListener('krox-finer-action', (e: any) => {
    const detail = e.detail;
    if (!detail) return;
    
    if (detail.action === 'global-plus' || detail.action === 'global-minus') {
        const more = detail.action === 'global-plus';
        const hashes = (detail.types || '').split(',').filter(Boolean);
        const prefix = detail.prefix || 'pseudo.pseudo_';
        
        const ISG_AND = ItemSearchGroupsVueItems('and')?.find((g: any) => g.index === 0);
        let reload = false;

        hashes.forEach((hash: string) => {
          const reHashed = `${prefix}${modMap[hash]}`;
          const current = ISG_AND?.filters?.find((f: any) => f.id === reHashed);
          if (current) {
            const idx = ISG_AND.filters.indexOf(current);
            const curVal = ISG_AND.state.filters[idx].value || {};
            const curMin = curVal.min || 0;
            if (curMin || more) ISG_AND.updateFilter(idx, { min: curMin + (more ? 10 : -10) });
            else ISG_AND.removeFilter(idx);
            reload = true;
          } else if (more && ISG_AND?.selectFilter) {
            ISG_AND.selectFilter(createFilter(reHashed));
            reload = true;
          }
        });

        if (reload && getGlobalApp()?.save) {
          getGlobalApp().save(true);
        }
    }
  });

  // Preserve Trade Plus behavior on the native trade-site search fields.
  const findTradeSearchInput = (target: EventTarget | null): HTMLInputElement | null => {
    if (!(target instanceof Element)) return null;

    const input = target.closest('input.multiselect__input');
    return input instanceof HTMLInputElement ? input : null;
  };

  const setNativeInputValue = (input: HTMLInputElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, value);
  };

  const prefixingInputs = new WeakSet<HTMLInputElement>();

  const ensureRegexPrefix = (input: HTMLInputElement, inputType?: string) => {
    const value = input.value ?? '';
    if (!value || value.startsWith('~') || value.startsWith(' ')) return;
    if (inputType?.startsWith('delete')) return;
    if (prefixingInputs.has(input)) return;

    prefixingInputs.add(input);

    try {
      const start = input.selectionStart ?? value.length;
      const end = input.selectionEnd ?? value.length;
      const canUseRangeText = typeof input.setRangeText === 'function' && start !== null && end !== null;

      if (canUseRangeText) {
        input.setRangeText('~', 0, 0, 'preserve');
      } else {
        setNativeInputValue(input, `~${value}`);
        input.setSelectionRange(start + 1, end + 1);
      }

      input.dispatchEvent(new Event('input', { bubbles: true }));
    } finally {
      queueMicrotask(() => {
        prefixingInputs.delete(input);
      });
    }
  };

  document.addEventListener('input', (e: Event) => {
    const input = findTradeSearchInput(e.target);
    if (!input) return;
    const inputEvent = e as InputEvent;
    if (inputEvent.isComposing) return;
    ensureRegexPrefix(input, inputEvent.inputType);
  }, true);



  const getGlobalApp = () => (window as any).app;

  // ---------- interactions ----------


  function addOrRemoveFilter(e: any, isAnd: boolean, btn: HTMLElement) {
    const filterType = isAnd ? 'and' : 'not';
    const modEl = btn.closest('div'); 
    const rowId = modEl?.dataset?.rowid;
    if (!rowId) return;
    
    const VueElem = findVueResultItem(rowId) || {};
    const statHash = modEl?.dataset?.hash;
    const newFilter = createFilter(statHash || "");
    const group = ItemSearchGroupsVueItems(filterType)?.find((g: any) => g.index !== 0);

    if (group && group.selectFilter) {
        group.selectFilter(newFilter);
    } else if (VueElem.$store?.commit) {
        VueElem.$store.commit('pushStatGroup', { type: filterType, filters: [newFilter] });
    }

    if (getGlobalApp()?.save) {
        getGlobalApp().save(true);
    }
    const panel = ItemResultPanelVueItem();
    if (panel?.search) {
        panel.search();
    }
  }
}
