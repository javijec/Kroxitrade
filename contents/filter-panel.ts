import { isFinerFiltersActionMessage } from "~/lib/utilities/finer-filters-bridge"
import {
  BUYOUT_CURRENCY_PRESETS,
  clearBuyoutPrice,
  setBuyoutCurrencyPreset
} from "~/lib/utilities/buyout-currency"
import { tradeContext } from "~/lib/core/trade-context"
import { translate, type AppLanguage } from "~/lib/services/i18n"
import { storageService } from "~/lib/services/storage"
import {
  expandedFilterGroup,
  finerResultRows,
  layoutButton,
  modHashField,
  modLabelField,
  mods,
  modsForAction,
  modValueField,
  multiselectInput,
  quickFiltersPane
} from "~/lib/site-adapter/selectors/common"
import { mutatedModContainer } from "~/lib/site-adapter/selectors/poe1"

export const initFilterPanel = () => {
  if ((window as any).__KROX_STARTED__) {
    return
  }

  ;(window as any).__KROX_STARTED__ = true

  const pageTranslation = (key: string) =>
    translate(
      (storageService.getLocalValue("language") || "en") as AppLanguage,
      key
    )

  const createBuyoutClearButton = () => {
    const button = document.createElement("button")
    button.type = "button"
    button.className =
      "krox-filter-preset__btn krox-filter-preset__btn--currency krox-filter-preset__btn--clear"
    button.textContent = pageTranslation("finer.clearBuyoutPrice")
    button.dataset.action = "krox-clear-buyout-price"
    return button
  }

  // ---------- helpers ----------
  const $ = (sel: string, root = document) => root.querySelector(sel)
  const $$ = (sel: string, root = document) =>
    Array.from(root.querySelectorAll(sel))
  const on = (
    type: string,
    selector: string,
    handler: Function,
    opts?: any
  ) => {
    document.addEventListener(
      type,
      (e: any) => {
        const el = e.target.closest(selector)
        if (!el) return
        handler.call(el, e, el)
      },
      opts
    )
  }
  const onEnter = (selector: string, handler: Function) => {
    document.addEventListener("mouseover", (e: any) => {
      const el = e.target.closest(selector)
      if (!el) return
      const rt = e.relatedTarget
      if (rt && (rt === el || el.contains(rt))) return
      handler.call(el, e, el)
    })
  }
  const onLeave = (selector: string, handler: Function) => {
    document.addEventListener("mouseout", (e: any) => {
      const el = e.target.closest(selector)
      if (!el) return
      const rt = e.relatedTarget
      if (rt && (rt === el || el.contains(rt))) return
      handler.call(el, e, el)
    })
  }
  const listModifiers: Array<{
    name: string
    types: string[]
    prefix: string
  }> = []
  listModifiers.push({
    name: "Pseudo Res/Life",
    types: ["life", "cold", "fire", "light", "chaos"],
    prefix: "pseudo.pseudo_"
  })
  listModifiers.push({
    name: "Explicit Res/Life",
    types: [
      "explicit_life",
      "explicit_cold",
      "explicit_fire",
      "explicit_light",
      "explicit_chaos"
    ],
    prefix: "explicit.stat_"
  })
  listModifiers.push({
    name: "Attack Weapon",
    types: [
      "explicit_inc_phy_dmg",
      "explicit_add_phy_local",
      "explicit_add_fire_local",
      "explicit_add_cold_local",
      "explicit_add_light_local",
      "explicit_add_chaos_local",
      "explicit_inc_attack_speed_local",
      "explicit_inc_crit_chance",
      "explicit_global_crit_mult"
    ],
    prefix: "explicit.stat_"
  })
  listModifiers.push({
    name: "Spell Weapon",
    types: [
      "explicit_inc_spell_dmg",
      "explicit_inc_fire_spell_dmg",
      "explicit_inc_cold_spell_dmg",
      "explicit_inc_light_spell_dmg",
      "explicit_add_fire_spell_dmg",
      "explicit_add_cold_spell_dmg",
      "explicit_add_light_spell_dmg",
      "explicit_gain_extra_fire_damage",
      "explicit_gain_extra_cold_damage",
      "explicit_gain_extra_light_damage",
      "explicit_level_all_spells",
      "explicit_level_all_fire_spells",
      "explicit_level_all_cold_spells",
      "explicit_level_all_light_spells",
      "explicit_level_all_physical_spells",
      "explicit_level_all_chaos_spells",
      "explicit_inc_cast_speed",
      "explicit_global_crit_mult"
    ],
    prefix: "explicit.stat_"
  })

  // ---------- overlay/button templates ----------
  const filteredOverlay = () => {
    const overlay = document.createElement("div")
    overlay.className = "finer-filtered-overlay"
    return overlay
  }
  const buttonsTemplate = () => {
    const buttons = document.createElement("span")
    buttons.id = "btns-finer"

    const remove = document.createElement("span")
    remove.className = "btn-finer rm"
    remove.dataset.action = "rmv-filter"
    remove.title = "remove this mod from your search results"
    remove.textContent = "-"

    const add = document.createElement("span")
    add.className = "btn-finer add"
    add.dataset.action = "add-filter"
    add.title = "add this mod to your search filters"
    add.textContent = "+"

    buttons.append(remove, add)
    return buttons
  }
  const globalPresetsTemplate = () => {
    const panel = document.createElement("div")
    panel.className = "krox-filter-presets"
    panel.dataset.kroxFilterPresets = "true"

    const title = document.createElement("div")
    title.className = "krox-filter-presets__title"
    title.textContent = "Quick filter presets"

    const list = document.createElement("div")
    list.className = "krox-filter-presets__list"

    panel.append(title, list)
    return panel
  }

  // ---------- map ----------
  const modMap: Record<string, string> = {
    life: "total_life",
    cold: "total_cold_resistance",
    fire: "total_fire_resistance",
    light: "total_lightning_resistance",
    chaos: "total_chaos_resistance",
    move: "increased_movement_speed",
    allR: "total_elemental_resistance",
    explicit_life: "3299347043",
    explicit_cold: "4220027924",
    explicit_fire: "3372524247",
    explicit_light: "1671376347",
    explicit_chaos: "2923486259",
    explicit_inc_phy_dmg: "1509134228",
    explicit_add_phy_local: "1940865751",
    explicit_add_fire_local: "709508406",
    explicit_add_cold_local: "1037193709",
    explicit_add_light_local: "3336890334",
    explicit_add_chaos_local: "2223678961",
    explicit_inc_attack_speed_local: "210067635",
    explicit_inc_crit_chance: "2375316951",
    explicit_global_crit_mult: "3556824919",
    explicit_inc_spell_dmg: "2974417149",
    explicit_inc_fire_spell_dmg: "3962278098",
    explicit_inc_cold_spell_dmg: "3291658075",
    explicit_inc_light_spell_dmg: "2231156303",
    explicit_add_fire_spell_dmg: "1133016593",
    explicit_add_cold_spell_dmg: "2469416729",
    explicit_add_light_spell_dmg: "2831165374",
    explicit_level_all_spells: "124131830",
    explicit_level_all_fire_spells: "591105508",
    explicit_level_all_cold_spells: "2254480358",
    explicit_level_all_light_spells: "1545858329",
    explicit_level_all_physical_spells: "4226189338",
    explicit_level_all_chaos_spells: "2891184298",
    explicit_inc_cast_speed: "737908626",
    explicit_gain_extra_fire_damage: "3015669065",
    explicit_gain_extra_cold_damage: "2505884597",
    explicit_gain_extra_light_damage: "3278136794"
  }
  const createFilter = (id: string) => id && { id, value: {}, disabled: false }

  const finder = (vm: any, v: string) => vm?.$vnode?.tag?.includes?.(v)
  const getApp = () => (window as any).app
  const findVueItem = (tags: string[]) =>
    tags.reduce(
      (acc, v) => acc?.$children?.find?.((e: any) => finder(e, v)),
      getApp()
    )
  const ItemResultPanelVueItem = () => findVueItem(["item-results-panel"])
  const findVueResultItem = (_itemId: string) =>
    findVueItem(["item-results-panel", "resultset"])?.$children?.find?.(
      (e: any) => e.itemId === _itemId
    )
  const ItemSearchGroupsVueItems = (_type?: string) => {
    const panel = findVueItem(["item-search-panel", "item-filter-panel"])
    return (
      panel?.$children?.filter?.(
        (e: any) =>
          finder(e, "stat-filter-group") &&
          (_type ? e.group.type === _type : true)
      ) || []
    )
  }

  const modSelectors = mods

  const getRowId = (mod: HTMLElement) => {
    const row = mod.closest("[data-id]") as HTMLElement | null
    return row?.getAttribute("data-id") || row?.id || mod.dataset.rowid || ""
  }

  const getModHashFromDom = (mod: HTMLElement) => {
    const sEl = mod.querySelector(modHashField) as HTMLElement | null
    const fieldVal =
      sEl?.dataset?.field || sEl?.getAttribute("data-field") || ""
    return fieldVal.startsWith("stat.") ? fieldVal.slice(5) : fieldVal
  }

  const normalizeMutatedModHashes = (root: ParentNode = document) => {
    const containers = new Set<HTMLElement>()
    if (
      root instanceof HTMLElement &&
      root.matches(mutatedModContainer)
    ) {
      containers.add(root)
    }
    root
      .querySelectorAll?.(mutatedModContainer)
      .forEach((container) => containers.add(container as HTMLElement))

    containers.forEach((container) => {
      const mods = Array.from(
        container.querySelectorAll(
          ":scope > .item-mod--mutated, :scope > .item-mod--explicit"
        )
      ) as HTMLElement[]
      const mutatedCount = mods.filter((mod) =>
        mod.classList.contains("item-mod--mutated")
      ).length

      if (!mutatedCount || mutatedCount >= mods.length) {
        mods.forEach((mod) => delete mod.dataset.finerHashOverride)
        return
      }

      const mutatedModsAreFirst = mods
        .slice(0, mutatedCount)
        .every((mod) => mod.classList.contains("item-mod--mutated"))
      const hashes = mods.map(getModHashFromDom)

      if (!mutatedModsAreFirst || hashes.some((hash) => !hash)) {
        mods.forEach((mod) => delete mod.dataset.finerHashOverride)
        return
      }

      const reorderedHashes = [
        ...hashes.slice(-mutatedCount),
        ...hashes.slice(0, -mutatedCount)
      ]
      mods.forEach((mod, index) => {
        mod.dataset.finerHashOverride = reorderedHashes[index]
      })
    })
  }

  const attachButtons = (mod: HTMLElement) => {
    const btns =
      (mod.querySelector("#btns-finer") as HTMLElement | null) ||
      buttonsTemplate()
    if (!btns) return

    const staleWrappers = mod.querySelectorAll(
      ":scope > .finer-mod-content, :scope > .finer-mod-actions"
    )
    staleWrappers.forEach((wrapper) => {
      while (wrapper.firstChild) {
        mod.insertBefore(wrapper.firstChild, wrapper)
      }
      wrapper.remove()
    })

    mod.style.overflow = "visible"

    const rowId = mod.dataset.rowid || getRowId(mod)
    const statHash = mod.dataset.hash || ""
    if (rowId) btns.setAttribute("data-rowid", rowId)
    if (statHash) btns.setAttribute("data-hash", statHash)

    const isImplicitMod = mod.classList.contains("item-mod--implicit")
    const isUniqueExplicitMod =
      !!mod.closest(".item-popup--unique") &&
      mod.classList.contains("item-mod--explicit")
    const isSpecialMod = isImplicitMod || isUniqueExplicitMod
    const isCompactResults = !!mod.closest(".results.compact")
    btns.classList.remove("finer-fixed-right")
    const host =
      isSpecialMod && isCompactResults
        ? (mod.querySelector(modLabelField) as HTMLElement | null)
        : (mod.querySelector(modValueField) as HTMLElement | null)

    if (isSpecialMod && !isCompactResults) {
      btns.classList.add("finer-fixed-right")
    }

    const nextHost = host || mod
    if (btns.parentElement !== nextHost) {
      btns.parentElement?.removeChild(btns)
      nextHost.appendChild(btns)
    }
  }

  const decorateMod = (mod: HTMLElement, ISGs: any[]) => {
    const modHash = mod.dataset.finerHashOverride || getModHashFromDom(mod)
    if (!modHash) return

    mod.dataset.hash = modHash
    const rowId = getRowId(mod)
    if (rowId) mod.dataset.rowid = rowId

    const isInFilters = ISGs.some(
      (isg: any) =>
        isg.filters && isg.filters.some((f: any) => f.id === modHash)
    )
    if (isInFilters) {
      mod.classList.add("finer-filtered")
      if (!mod.querySelector(".finer-filtered-overlay")) {
        const overlay = filteredOverlay()
        if (overlay) mod.appendChild(overlay)
      }
    } else {
      mod.classList.add("finer-filterable")
    }

    attachButtons(mod)
  }

  const scanVisibleMods = (root: ParentNode = document) => {
    const ISGs = ItemSearchGroupsVueItems()
    normalizeMutatedModHashes(root)
    Array.from(
      root.querySelectorAll(modSelectors) as NodeListOf<HTMLElement>
    ).forEach((mod) => {
      decorateMod(mod, ISGs)
    })
  }

  let layoutRefreshTimer: ReturnType<typeof setTimeout> | null = null
  const refreshButtonsForLayout = () => {
    if (layoutRefreshTimer) clearTimeout(layoutRefreshTimer)
    layoutRefreshTimer = setTimeout(() => {
      scanVisibleMods()
      layoutRefreshTimer = null
    }, 80)
  }

  // step 1: hover a result row -> check filters
  onEnter(
    finerResultRows,
    (e: any, row: HTMLElement) => {
      if (row.classList.contains("finer-processed")) return

      // Check if the vue app exists
      if (!getApp()) {
        console.warn(
          "[Krox-MainWorld] Vue 'window.app' not found. Is this PoE 2 Trade?"
        )
      }

      const mods = Array.from(
        row.querySelectorAll(modSelectors)
      ) as HTMLElement[]
      const ISGs = ItemSearchGroupsVueItems()

      normalizeMutatedModHashes(row)
      mods.forEach((mod) => decorateMod(mod, ISGs))

      row.classList.add("finer-processed")
    }
  )

  // step 2: make buttons visible on item mods
  scanVisibleMods()
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        if (node.matches?.(modSelectors)) {
          const content = node.closest(
            mutatedModContainer
          )
          if (content) normalizeMutatedModHashes(content)
          decorateMod(node, ItemSearchGroupsVueItems())
        }
        scanVisibleMods(node)
      })
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })

  on("click", layoutButton, () => {
    refreshButtonsForLayout()
    setTimeout(refreshButtonsForLayout, 220)
  })

  // step 3: click ± inside the buttons
  on("click", '[data-action="add-filter"]', (e: any, el: HTMLElement) => {
    addOrRemoveFilter(e, true, el)
  })
  on("click", '[data-action="rmv-filter"]', (e: any, el: HTMLElement) => {
    addOrRemoveFilter(e, false, el)
  })

  const setNativeInputValue = (input: HTMLInputElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )
    descriptor?.set?.call(input, value)
  }

  const applyFinerFiltersAction = (detail: {
    action: "global-plus" | "global-minus"
    types: string
    prefix: string
  }) => {
    if (detail.action !== "global-plus" && detail.action !== "global-minus")
      return

    const more = detail.action === "global-plus"
    const hashes = (detail.types || "").split(",").filter(Boolean)
    const prefix = detail.prefix || "pseudo.pseudo_"

    const ISG_AND = ItemSearchGroupsVueItems("and")?.find(
      (g: any) => g.index === 0
    )
    let reload = false

    hashes.forEach((hash: string) => {
      const reHashed = `${prefix}${modMap[hash]}`
      const current = ISG_AND?.filters?.find((f: any) => f.id === reHashed)
      if (current) {
        const idx = ISG_AND.filters.indexOf(current)
        const curVal = ISG_AND.state.filters[idx].value || {}
        const curMin = curVal.min || 0
        if (curMin || more)
          ISG_AND.updateFilter(idx, { min: curMin + (more ? 10 : -10) })
        else ISG_AND.removeFilter(idx)
        reload = true
      } else if (more && ISG_AND?.selectFilter) {
        ISG_AND.selectFilter(createFilter(reHashed))
        reload = true
      }
    })

    if (reload && getGlobalApp()?.save) {
      getGlobalApp().save(true)
    }
  }

  const injectSearchPanelQuickFilters = () => {
    const pane = document.querySelector<HTMLElement>(quickFiltersPane)
    const existing = pane?.querySelector('[data-krox-filter-presets="true"]')
    const isExchangeRoute = /^\/trade2?\/exchange(?:\/|$)/.test(
      window.location.pathname
    )

    if (isExchangeRoute) {
      existing?.remove()
      return
    }

    const isPoe2 = tradeContext.get().game === "poe2"
    const storageKey = isPoe2
      ? "quick-filters-visible-poe2"
      : "quick-filters-visible-poe1"
    const placementKey = isPoe2
      ? "quick-filters-placement-poe2"
      : "quick-filters-placement-poe1"

    if (
      storageService.getLocalValue(storageKey) === "false" ||
      storageService.getLocalValue(placementKey) === "sidebar"
    ) {
      existing?.remove()
      return
    }

    if (!pane) {
      return
    }

    if (existing) {
      const currencyRow = existing.querySelector<HTMLElement>(
        ".krox-filter-preset--currency"
      )
      if (!currencyRow?.querySelector('[data-action="krox-clear-buyout-price"]')) {
        currencyRow?.append(createBuyoutClearButton())
      }
      return
    }

    const panel = globalPresetsTemplate() as HTMLElement | null
    const list = panel?.querySelector(".krox-filter-presets__list")
    if (!panel || !list) return

    listModifiers.forEach((modifier) => {
      const row = document.createElement("div")
      row.className = "krox-filter-preset"

      const label = document.createElement("span")
      label.className = "krox-filter-preset__name"
      label.textContent = modifier.name

      const minus = document.createElement("button")
      minus.type = "button"
      minus.className = "krox-filter-preset__btn krox-filter-preset__btn--minus"
      minus.textContent = "-"
      minus.title = `Reduce ${modifier.name}`
      minus.dataset.action = "krox-global-minus"
      minus.dataset.types = modifier.types.join(",")
      minus.dataset.prefix = modifier.prefix

      const plus = document.createElement("button")
      plus.type = "button"
      plus.className = "krox-filter-preset__btn krox-filter-preset__btn--plus"
      plus.textContent = "+"
      plus.title = `Add ${modifier.name}`
      plus.dataset.action = "krox-global-plus"
      plus.dataset.types = modifier.types.join(",")
      plus.dataset.prefix = modifier.prefix

      row.append(label, minus, plus)
      list.appendChild(row)
    })

    const currencyRow = document.createElement("div")
    currencyRow.className =
      "krox-filter-preset krox-filter-preset--currency"

    const currencyLabel = document.createElement("span")
    currencyLabel.className = "krox-filter-preset__name"
    currencyLabel.textContent = "Buyout Price"

    currencyRow.append(currencyLabel)
    BUYOUT_CURRENCY_PRESETS.forEach(({ label, currency }) => {
      const currencyButton = document.createElement("button")
      currencyButton.type = "button"
      currencyButton.className =
        "krox-filter-preset__btn krox-filter-preset__btn--currency"
      currencyButton.textContent = label
      currencyButton.title = currency
      currencyButton.dataset.action = "krox-currency-preset"
      currencyButton.dataset.currency = currency
      currencyRow.append(currencyButton)
    })

    currencyRow.append(createBuyoutClearButton())
    list.appendChild(currencyRow)

    const firstExpandedGroup = pane.querySelector(expandedFilterGroup)
    pane.insertBefore(panel, firstExpandedGroup || pane.firstChild)
  }

  on("click", ".krox-filter-preset__btn", (e: any, el: HTMLElement) => {
    e.preventDefault()
    e.stopPropagation()

    if (el.dataset.action === "krox-currency-preset") {
      const preset = BUYOUT_CURRENCY_PRESETS.find(
        ({ currency }) => currency === el.dataset.currency
      )
      setBuyoutCurrencyPreset(preset?.currency || "Chaos Orb")
      return
    }

    if (el.dataset.action === "krox-clear-buyout-price") {
      clearBuyoutPrice()
      return
    }

    applyFinerFiltersAction({
      action:
        el.dataset.action === "krox-global-minus"
          ? "global-minus"
          : "global-plus",
      types: el.dataset.types || "",
      prefix: el.dataset.prefix || "pseudo.pseudo_"
    })
  })

  injectSearchPanelQuickFilters()
  const quickFiltersObserver = new MutationObserver(() => {
    injectSearchPanelQuickFilters()
  })
  quickFiltersObserver.observe(document.body, { childList: true, subtree: true })
  window.addEventListener("storage", (event) => {
    if (
      event.key?.startsWith("poe-trade-plus:quick-filters-visible-poe") ||
      event.key?.startsWith("poe-trade-plus:quick-filters-placement-poe")
    ) {
      injectSearchPanelQuickFilters()
    }
  })
  window.addEventListener("poe-trade-plus:quick-filters-change", () => {
    injectSearchPanelQuickFilters()
  })

  // listener for actions dispatched from the Svelte sidebar
  const handleFinerFiltersMessage = (e: MessageEvent<unknown>) => {
    if (!isFinerFiltersActionMessage(e)) return
    applyFinerFiltersAction(e.data.detail)
  }

  window.addEventListener("message", handleFinerFiltersMessage)
  document.addEventListener("krox-finer-action", (e: any) => {
    const detail = e.detail
    if (!detail) return
    applyFinerFiltersAction(detail)
  })

  // Preserve Trade Plus behavior on the native trade-site search fields.
  const findTradeSearchInput = (
    target: EventTarget | null
  ): HTMLInputElement | null => {
    if (!(target instanceof Element)) return null

    const input = target.closest(multiselectInput)
    return input instanceof HTMLInputElement ? input : null
  }

  const prefixingInputs = new WeakSet<HTMLInputElement>()

  const ensureRegexPrefix = (input: HTMLInputElement, inputType?: string) => {
    if (document.documentElement.dataset.kroxAutoFuzzy === "off") return

    const value = input.value ?? ""
    if (!value || value.startsWith("~") || value.startsWith(" ")) return
    if (inputType?.startsWith("delete")) return
    if (prefixingInputs.has(input)) return

    prefixingInputs.add(input)

    try {
      const start = input.selectionStart ?? value.length
      const end = input.selectionEnd ?? value.length
      const canUseRangeText =
        typeof input.setRangeText === "function" &&
        start !== null &&
        end !== null

      if (canUseRangeText) {
        input.setRangeText("~", 0, 0, "preserve")
      } else {
        setNativeInputValue(input, `~${value}`)
        input.setSelectionRange(start + 1, end + 1)
      }

      input.dispatchEvent(new Event("input", { bubbles: true }))
    } finally {
      queueMicrotask(() => {
        prefixingInputs.delete(input)
      })
    }
  }

  document.addEventListener(
    "input",
    (e: Event) => {
      const input = findTradeSearchInput(e.target)
      if (!input) return
      const inputEvent = e as InputEvent
      if (inputEvent.isComposing) return
      ensureRegexPrefix(input, inputEvent.inputType)
    },
    true
  )

  const getGlobalApp = () => (window as any).app

  // ---------- interactions ----------

  function addOrRemoveFilter(e: any, isAnd: boolean, btn: HTMLElement) {
    e.preventDefault()
    e.stopPropagation()
    const filterType = isAnd ? "and" : "not"
    const btns = btn.closest("#btns-finer") as HTMLElement | null
    const modEl = btn.closest(
      modsForAction
    ) as HTMLElement | null
    const rowId = btns?.dataset?.rowid || modEl?.dataset?.rowid
    if (!rowId) return

    const VueElem = findVueResultItem(rowId) || {}
    const statHash = btns?.dataset?.hash || modEl?.dataset?.hash
    const newFilter = createFilter(statHash || "")
    const group = ItemSearchGroupsVueItems(filterType)?.find(
      (g: any) => g.index !== 0
    )
    const globalStore = getGlobalApp()?.$store

    if (group && group.selectFilter) {
      group.selectFilter(newFilter)
    } else if (globalStore?.commit) {
      globalStore.commit("pushStatGroup", {
        type: filterType,
        filters: [newFilter]
      })
    }

    if (getGlobalApp()?.save) {
      getGlobalApp().save(true)
    }
    const panel = ItemResultPanelVueItem()
    if (panel?.search) {
      panel.search()
    }
  }
}
