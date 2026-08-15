// DOM templates for the quick filter presets panel injected into the Trade
// search panel.

import { translate, type AppLanguage } from "~/lib/services/i18n"
import { storageService } from "~/lib/services/storage"

const pageTranslation = (key: string) =>
  translate(
    (storageService.getLocalValue("language") || "en") as AppLanguage,
    key
  )

export const createBuyoutClearButton = () => {
  const button = document.createElement("button")
  button.type = "button"
  button.className =
    "krox-filter-preset__btn krox-filter-preset__btn--currency krox-filter-preset__btn--clear"
  button.textContent = pageTranslation("finer.clearBuyoutPrice")
  button.dataset.action = "krox-clear-buyout-price"
  return button
}

export const globalPresetsTemplate = () => {
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
