// Filter interactions with the Trade site's Vue stat-filter groups.

import { modsForAction } from "~/lib/site-adapter/selectors/common"

import { modMap } from "./stat-map"
import {
  createFilter,
  getGlobalApp,
  ItemResultPanelVueItem,
  ItemSearchGroupsVueItems
} from "./vue-internals"

export const applyFinerFiltersAction = (detail: {
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

export const addOrRemoveFilter = (e: any, isAnd: boolean, btn: HTMLElement) => {
  e.preventDefault()
  e.stopPropagation()
  const filterType = isAnd ? "and" : "not"
  const btns = btn.closest("#btns-finer") as HTMLElement | null
  const modEl = btn.closest(modsForAction) as HTMLElement | null
  const rowId = btns?.dataset?.rowid || modEl?.dataset?.rowid
  if (!rowId) return

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
