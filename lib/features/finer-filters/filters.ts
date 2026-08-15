// Filter interactions with the Trade site's stat-filter groups.

import { modsForAction } from "~/lib/site-adapter/selectors/common"
import { tradeFilters } from "~/lib/site-adapter/trade-filters"

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

  const andGroup = tradeFilters.getFilters("and").find((g) => g.index === 0)
  let reload = false

  hashes.forEach((hash: string) => {
    const reHashed = `${prefix}${modMap[hash]}`
    const current = andGroup?.filters.find((f) => f.id === reHashed)
    if (current && andGroup) {
      const idx = andGroup.filters.indexOf(current)
      const curMin = current.value.min || 0
      if (curMin || more) {
        tradeFilters.updateFilter(andGroup, idx, {
          min: curMin + (more ? 10 : -10)
        })
      } else {
        tradeFilters.removeFilter(andGroup, idx)
      }
      reload = true
    } else if (more) {
      if (tradeFilters.addFilter(reHashed, "and", andGroup)) reload = true
    }
  })

  if (reload) tradeFilters.save()
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
  tradeFilters.addFilter(statHash || "", filterType)

  tradeFilters.save()
  tradeFilters.refresh()
}
