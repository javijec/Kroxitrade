import { tradeContext } from "../core/trade-context"
import {
  buyoutPriceInputs,
  filterTitle,
  multiselect,
  multiselectInput,
  multiselectOption
} from "../site-adapter/selectors/common"
import { tradeDom } from "../site-adapter/trade-dom"

export type BuyoutCurrency =
  | "Chaos Orb"
  | "Exalted Orb"
  | "Divine Orb"
  | "Chaos Orb Equivalent"
  | "Exalted Orb Equivalent"

export type BuyoutCurrencyPreset = {
  label: string
  currency: BuyoutCurrency
}

export const BUYOUT_CURRENCY_PRESETS: BuyoutCurrencyPreset[] = [
  { label: "Chaos", currency: "Chaos Orb" },
  { label: "Exalted", currency: "Exalted Orb" },
  { label: "Divine", currency: "Divine Orb" }
]

const setNativeInputValue = (input: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )
  descriptor?.set?.call(input, value)
}

const buyoutFilterTitles = [
  "Buyout Price",
  "Preço de Compra",
  "Цена выкупа",
  "ราคาขายทันที",
  "Preis",
  "Directe",
  "Precio de compra",
  "バイアウト価格",
  "즉시 구매 가격",
  "直購價",
  "直购价"
]

const buyoutCurrencyLabels: Record<BuyoutCurrency, string[]> = {
  "Chaos Orb Equivalent": [
    "Chaos Orb Equivalent",
    "Equivalente a Orbe do Caos",
    "Эквивалент сферы хаоса",
    "เทียบเป็น Chaos Orb",
    "Wert in Chaossphären",
    "Équivalent en orbes du chaos",
    "Equivalente a Orbe de caos",
    "カオスオーブ同等物",
    "카오스 오브 등가물",
    "與混沌石等值",
    "与混沌石等值"
  ],
  "Exalted Orb Equivalent": [
    "Exalted Orb Equivalent",
    "Equivalente a Orbe Exaltado",
    "Эквивалент сфер возвышения",
    "เทียบเป็น Exalted Orb",
    "Erhabene Sphäre Äquivalent",
    "Équivalent en orbes exaltés",
    "Equivalente a Orbe Exaltado",
    "高貴なオーブ同等物",
    "엑잘티드 오브 등가물",
    "與崇高石等值",
    "与崇高石等值"
  ],
  "Chaos Orb": [
    "Chaos Orb",
    "Orbe do Caos",
    "Сфера хаоса",
    "Chaos Orb",
    "Chaossphäre",
    "Orbe du chaos",
    "Orbe de caos",
    "カオスオーブ",
    "카오스 오브",
    "混沌石",
    "混沌石"
  ],
  "Exalted Orb": [
    "Exalted Orb",
    "Orbe Exaltado",
    "Сфера возвышения",
    "Exalted Orb",
    "Erhabene Sphäre",
    "Orbe exalté",
    "Orbe exaltado",
    "高貴なオーブ",
    "엑잘티드 오브",
    "崇高石",
    "崇高石"
  ],
  "Divine Orb": [
    "Divine Orb",
    "Orbe Divino",
    "Божественная сфера",
    "Divine Orb",
    "Göttliche Sphäre",
    "Orbe divin",
    "Orbe divino",
    "神のオーブ",
    "신성한 오브",
    "神聖石",
    "神圣石"
  ]
}

const normalizeLabel = (value: string | null | undefined) =>
  value?.replace(/\s+/g, " ").trim() || ""

// Structural fallback: the Buyout Price row is the filter-property with a
// currency multiselect and its two price inputs. This survives the translated
// title text and is independent of the trade-site language.
const findBuyoutFilterStructural = () => {
  const filters = tradeDom.getFilterProperties()

  return (
    filters.find((filter) => {
      const hasCurrencyMultiselect = !!filter.querySelector(
        `${multiselect} ${multiselectInput}`
      )
      const priceInputs = filter.querySelectorAll<HTMLInputElement>(
        buyoutPriceInputs
      )
      return hasCurrencyMultiselect && priceInputs.length >= 2
    }) || null
  )
}

const findBuyoutFilter = () => {
  const filters = tradeDom.getFilterProperties()

  const byTitle = filters.find((filter) => {
    const title = normalizeLabel(filter.querySelector(filterTitle)?.textContent)
    return buyoutFilterTitles.includes(title)
  })

  return byTitle || findBuyoutFilterStructural()
}

const getLocalizedCurrencyLabel = (
  buyoutFilter: HTMLElement,
  currency: BuyoutCurrency
) => {
  const title = normalizeLabel(
    buyoutFilter.querySelector(filterTitle)?.textContent
  )
  // The translated site's multiselect options use the native Chinese labels
  // (e.g. 混沌石 / 崇高石 / 神聖石), so preserve the title-to-label mapping
  // instead of submitting the internal English currency id.
  const languageIndex = buyoutFilterTitles.indexOf(title)
  return buyoutCurrencyLabels[currency][languageIndex] || currency
}

export const setBuyoutCurrencyPreset = (currency: BuyoutCurrency) => {
  const buyoutFilter = findBuyoutFilter()
  const multiselectEl = buyoutFilter?.querySelector<HTMLElement>(multiselect)
  const input =
    multiselectEl?.querySelector<HTMLInputElement>(multiselectInput)

  if (!buyoutFilter || !multiselectEl || !input) return

  // Inspect all locale variants instead of deriving a single one from the
  // translated title. The displayed list can be English, Chinese or bilingual.
  const names = buyoutCurrencyLabels[currency]
    .map(normalizeLabel)
    .filter(Boolean)

  input.focus()
  input.click()
  setNativeInputValue(input, "")
  input.dispatchEvent(new Event("input", { bubbles: true }))

  const selectOption = () => {
    const option = Array.from(
      multiselectEl.querySelectorAll<HTMLElement>(multiselectOption)
    )
    if (option.length === 0) return false

    const labels = option.map((candidate) => normalizeLabel(candidate.textContent))
    let index = labels.findIndex((label) => names.includes(label))
    if (index === -1)
      index = labels.findIndex((label) => names.some((name) => label.startsWith(name)))
    if (index === -1)
      index = labels.findIndex((label) => names.some((name) => label.includes(name)))
    if (index === -1) return false

    option[index].dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    )
    input.dispatchEvent(new Event("change", { bubbles: true }))
    return true
  }

  let attempts = 0
  const trySelect = () => {
    if (selectOption() || attempts++ >= 8) return
    setTimeout(trySelect, 30)
  }
  setTimeout(trySelect, 0)
}

export const clearBuyoutPrice = () => {
  setBuyoutCurrencyPreset(
    tradeContext.get().game === "poe2"
      ? "Exalted Orb Equivalent"
      : "Chaos Orb Equivalent"
  )
}
