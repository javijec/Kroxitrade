// Quick filter presets — injects a preset panel into the Trade search panel and
// handles its buttons (global stat presets + buyout currency presets).

import { tradeContext } from "~/lib/core/trade-context"
import { tradeDomObserver } from "~/lib/core/trade-dom-observer"
import { storageService } from "~/lib/services/storage"
import {
  expandedFilterGroup,
  quickFiltersPane
} from "~/lib/site-adapter/selectors/common"
import { on } from "~/lib/site-adapter/trade-dom"
import {
  BUYOUT_CURRENCY_PRESETS,
  clearBuyoutPrice,
  setBuyoutCurrencyPreset
} from "~/lib/utilities/buyout-currency"

import { applyFinerFiltersAction } from "../finer-filters/filters"
import { listModifiers } from "./presets"
import { createBuyoutClearButton, globalPresetsTemplate } from "./templates"

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
    if (
      !currencyRow?.querySelector('[data-action="krox-clear-buyout-price"]')
    ) {
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
  currencyRow.className = "krox-filter-preset krox-filter-preset--currency"

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

export const initQuickFilters = () => {
  tradeDomObserver.subscribe({
    id: "quick-filters",
    handler: () => injectSearchPanelQuickFilters()
  })
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
}
