// DOM scanning and decoration of item mods on the Trade site (Finer Filters).

import {
  compactResults,
  modHashField,
  modLabelField,
  mods,
  modValueField,
  resultRowId,
  uniqueItemPopup
} from "~/lib/site-adapter/selectors/common"
import {
  containerModItems,
  modExplicitClass,
  modImplicitClass,
  modMutatedClass,
  mutatedModContainer
} from "~/lib/site-adapter/selectors/poe1"
import {
  tradeFilters,
  type TradeFilterGroup
} from "~/lib/site-adapter/trade-filters"

export const getRowId = (mod: HTMLElement) => {
  const row = mod.closest(resultRowId) as HTMLElement | null
  return row?.getAttribute("data-id") || row?.id || mod.dataset.rowid || ""
}

export const getModHashFromDom = (mod: HTMLElement) => {
  const sEl = mod.querySelector(modHashField) as HTMLElement | null
  const fieldVal = sEl?.dataset?.field || sEl?.getAttribute("data-field") || ""
  return fieldVal.startsWith("stat.") ? fieldVal.slice(5) : fieldVal
}

export const normalizeMutatedModHashes = (root: ParentNode = document) => {
  const containers = new Set<HTMLElement>()
  if (root instanceof HTMLElement && root.matches(mutatedModContainer)) {
    containers.add(root)
  }
  root
    .querySelectorAll?.(mutatedModContainer)
    .forEach((container) => containers.add(container as HTMLElement))

  containers.forEach((container) => {
    const mods = Array.from(
      container.querySelectorAll(containerModItems)
    ) as HTMLElement[]
    const mutatedCount = mods.filter((mod) =>
      mod.classList.contains(modMutatedClass)
    ).length

    if (!mutatedCount || mutatedCount >= mods.length) {
      mods.forEach((mod) => delete mod.dataset.finerHashOverride)
      return
    }

    const mutatedModsAreFirst = mods
      .slice(0, mutatedCount)
      .every((mod) => mod.classList.contains(modMutatedClass))
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

export const attachButtons = (mod: HTMLElement) => {
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

  const isImplicitMod = mod.classList.contains(modImplicitClass)
  const isUniqueExplicitMod =
    !!mod.closest(uniqueItemPopup) && mod.classList.contains(modExplicitClass)
  const isSpecialMod = isImplicitMod || isUniqueExplicitMod
  const isCompactResults = !!mod.closest(compactResults)
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

export const decorateMod = (mod: HTMLElement, groups: TradeFilterGroup[]) => {
  const modHash = mod.dataset.finerHashOverride || getModHashFromDom(mod)
  if (!modHash) return

  mod.dataset.hash = modHash
  const rowId = getRowId(mod)
  if (rowId) mod.dataset.rowid = rowId

  const isInFilters = groups.some((group) =>
    group.filters.some((f) => f.id === modHash)
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

export const scanVisibleMods = (root: ParentNode = document) => {
  const groups = tradeFilters.getFilters()
  normalizeMutatedModHashes(root)
  Array.from(root.querySelectorAll(mods) as NodeListOf<HTMLElement>).forEach(
    (mod) => {
      decorateMod(mod, groups)
    }
  )
}

let layoutRefreshTimer: ReturnType<typeof setTimeout> | null = null
export const refreshButtonsForLayout = () => {
  if (layoutRefreshTimer) clearTimeout(layoutRefreshTimer)
  layoutRefreshTimer = setTimeout(() => {
    scanVisibleMods()
    layoutRefreshTimer = null
  }, 80)
}
