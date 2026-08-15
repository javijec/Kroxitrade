// Finer Filters — scan Trade result mods, decorate them with ± buttons and keep
// the stat filters in sync.

import {
  finerResultRows,
  layoutButton,
  mods
} from "~/lib/site-adapter/selectors/common"
import { mutatedModContainer } from "~/lib/site-adapter/selectors/poe1"
import { on, onEnter } from "~/lib/site-adapter/trade-dom"
import { isFinerFiltersActionMessage } from "~/lib/utilities/finer-filters-bridge"

import {
  decorateMod,
  normalizeMutatedModHashes,
  refreshButtonsForLayout,
  scanVisibleMods
} from "./dom"
import { addOrRemoveFilter, applyFinerFiltersAction } from "./filters"
import { ItemSearchGroupsVueItems } from "./vue-internals"

export const initFinerFilters = () => {
  // step 1: hover a result row -> check filters
  onEnter(finerResultRows, (e: any, row: HTMLElement) => {
    if (row.classList.contains("finer-processed")) return

    // Check if the vue app exists
    if (!(window as any).app) {
      console.warn(
        "[Krox-MainWorld] Vue 'window.app' not found. Is this PoE 2 Trade?"
      )
    }

    const rowMods = Array.from(row.querySelectorAll(mods)) as HTMLElement[]
    const ISGs = ItemSearchGroupsVueItems()

    normalizeMutatedModHashes(row)
    rowMods.forEach((mod) => decorateMod(mod, ISGs))

    row.classList.add("finer-processed")
  })

  // step 2: make buttons visible on item mods
  scanVisibleMods()
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        if (node.matches?.(mods)) {
          const content = node.closest(mutatedModContainer)
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
}
