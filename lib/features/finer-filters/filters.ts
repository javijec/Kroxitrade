// Filter interactions with the Trade site's stat-filter groups.

import { modsForAction } from "~/lib/site-adapter/selectors/common"
import {
  createFilter,
  getStatFilterGroups,
  pushStatGroup,
  refreshResults,
  saveSearch
} from "~/lib/site-adapter/trade-filters"

import { modMap } from "./stat-map"

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

  const ISG_AND = getStatFilterGroups("and").find((g) => g.index === 0)
  let reload = false

  hashes.forEach((hash: string) => {
    const reHashed = `${prefix}${modMap[hash]}`
    const current = ISG_AND?.filters.find((f) => f.id === reHashed)
    if (current && ISG_AND) {
      const idx = ISG_AND.filters.indexOf(current)
      const curMin = ISG_AND.state.filters[idx].value?.min || 0
      if (curMin || more)
        ISG_AND.updateFilter!(idx, { min: curMin + (more ? 10 : -10) })
      else ISG_AND.removeFilter!(idx)
      reload = true
    } else if (more && ISG_AND?.selectFilter) {
      ISG_AND.selectFilter(createFilter(reHashed))
      reload = true
    }
  })

  if (reload) saveSearch()
}

export const addOrRemoveFilter = (
  e: Event,
  isAnd: boolean,
  btn: HTMLElement
) => {
  e.preventDefault()
  e.stopPropagation()
  const filterType = isAnd ? "and" : "not"
  const btns = btn.closest("#btns-finer") as HTMLElement | null
  const modEl = btn.closest(modsForAction) as HTMLElement | null
  const rowId = btns?.dataset?.rowid || modEl?.dataset?.rowid
  if (!rowId) return

  const statHash = btns?.dataset?.hash || modEl?.dataset?.hash
  const newFilter = createFilter(statHash || "")
  const group = getStatFilterGroups(filterType).find((g) => g.index !== 0)

  if (group?.selectFilter) {
    group.selectFilter(newFilter)
  } else {
    pushStatGroup(filterType, [newFilter])
  }

  saveSearch()
  refreshResults()
}
