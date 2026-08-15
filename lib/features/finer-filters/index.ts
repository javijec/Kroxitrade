// Finer Filters — scan Trade result mods, decorate them with ± buttons and keep
// the stat filters in sync.

import { extensionBus } from "~/lib/core/extension-bus"
import {
  createFeatureLifecycle,
  type FeatureLifecycle
} from "~/lib/core/feature-lifecycle"
import { tradeDomObserver } from "~/lib/core/trade-dom-observer"
import {
  finerResultRows,
  layoutButton,
  mods
} from "~/lib/site-adapter/selectors/common"
import { mutatedModContainer } from "~/lib/site-adapter/selectors/poe1"
import { on, onEnter } from "~/lib/site-adapter/trade-dom"
import { tradeFilters } from "~/lib/site-adapter/trade-filters"

import {
  decorateMod,
  normalizeMutatedModHashes,
  refreshButtonsForLayout,
  scanVisibleMods
} from "./dom"
import { addOrRemoveFilter, applyFinerFiltersAction } from "./filters"

export const createFinerFilters = (): FeatureLifecycle =>
  createFeatureLifecycle("finer-filters", () => {
    const stops: Array<() => void> = []

    // step 1: hover a result row -> check filters
    stops.push(
      onEnter(finerResultRows, (e: any, row: HTMLElement) => {
        if (row.classList.contains("finer-processed")) return

        // Check if the trade filter API is available
        if (!tradeFilters.isAvailable()) {
          console.warn("[Poe Trade Plus] Trade site filter API was not found.")
        }

        const rowMods = Array.from(row.querySelectorAll(mods)) as HTMLElement[]
        const groups = tradeFilters.getFilters()

        normalizeMutatedModHashes(row)
        rowMods.forEach((mod) => decorateMod(mod, groups))

        row.classList.add("finer-processed")
      })
    )

    // step 2: make buttons visible on item mods
    stops.push(
      tradeDomObserver.subscribe({
        id: "finer-filters",
        handler: (nodes) => {
          if (nodes.length === 0) {
            scanVisibleMods()
            return
          }
          for (const node of nodes) {
            if (node.matches?.(mods)) {
              const content = node.closest(mutatedModContainer)
              if (content) normalizeMutatedModHashes(content)
              decorateMod(node, tradeFilters.getFilters())
            }
            scanVisibleMods(node)
          }
        }
      })
    )

    stops.push(
      on("click", layoutButton, () => {
        refreshButtonsForLayout()
        setTimeout(refreshButtonsForLayout, 220)
      })
    )

    // step 3: click ± inside the buttons
    stops.push(
      on("click", '[data-action="add-filter"]', (e: any, el: HTMLElement) => {
        addOrRemoveFilter(e, true, el)
      })
    )
    stops.push(
      on("click", '[data-action="rmv-filter"]', (e: any, el: HTMLElement) => {
        addOrRemoveFilter(e, false, el)
      })
    )

    // listener for actions dispatched from the Svelte sidebar
    stops.push(
      extensionBus.on("finer-filters:action", (detail) => {
        applyFinerFiltersAction(detail)
      })
    )

    return () => stops.forEach((stop) => stop())
  })
