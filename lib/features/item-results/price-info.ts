// Pure helpers that turn a result row's price markup into comparable
// information (amount + currency) so the equivalent-pricing feature can
// convert it with poe.ninja ratios.

import { slugify } from "../../utilities/slugify"

export const CHAOS_SLUG = "chaos-orb"

export const referenceSlugs = {
  "1": ["divine-orb", "chaos-orb"],
  "2": ["exalted-orb", "divine-orb", "chaos-orb", "orb-of-annulment"]
} as const

export const currencySlugAliases: Record<string, string> = {
  chaos: "chaos-orb",
  divine: "divine-orb",
  exalted: "exalted-orb",
  exalt: "exalted-orb",
  regal: "regal-orb",
  vaal: "vaal-orb",
  alchemy: "orb-of-alchemy",
  annul: "orb-of-annulment",
  annullment: "orb-of-annulment",
  transmute: "orb-of-transmutation",
  transmutation: "orb-of-transmutation",
  augment: "orb-of-augmentation",
  augmentation: "orb-of-augmentation",
  chance: "orb-of-chance"
}

export const extractNormalizedPriceLabel = (container: HTMLElement) => {
  return (container.textContent || "")
    .replace(/\s+/g, " ")
    .replace(/^price\s*/i, "")
    .replace(/^asking price\s*/i, "")
    .replace(/asking price/gi, "")
    .replace(/\s*fee.*$/i, "")
    .replace(/^note\s*/i, "")
    .trim()
}

export const extractCurrencyAlt = (container: HTMLElement) => {
  const icons = Array.from(
    container.querySelectorAll<HTMLImageElement>("img[alt]")
  )
  for (const icon of icons) {
    const alt = icon.alt?.trim()
    if (!alt) continue
    if (/currency/i.test(alt)) continue
    return alt
  }

  return ""
}

export const resolveCurrencySlug = (currencyText: string) => {
  const baseSlug = slugify(currencyText)
  return currencySlugAliases[baseSlug] || baseSlug
}

export const extractPriceInfo = (row: HTMLElement) => {
  const container = row.querySelector<HTMLElement>(
    '[data-field="price"], .details .price, .itemHeader .lprice, .price'
  )
  if (!container) {
    return null
  }

  const normalizedLabel = extractNormalizedPriceLabel(container)
  const amountMatch = normalizedLabel.match(/[0-9]+(?:\.[0-9]+)?/)
  const amount = amountMatch ? parseFloat(amountMatch[0]) : Number.NaN
  const iconAlt = extractCurrencyAlt(container)

  let currencyText = iconAlt || ""
  if (!currencyText && amountMatch) {
    currencyText = normalizedLabel
      .slice(amountMatch.index! + amountMatch[0].length)
      .replace(/^x\s*/i, "")
      .trim()
  }

  if (!currencyText) {
    const rawCurrencyText = row.querySelector<HTMLElement>(
      '[data-field="price"] .currency-text span, .currency-text span, .currency-text'
    )?.textContent
    currencyText = rawCurrencyText?.trim() || ""
  }

  return {
    container,
    amount,
    currencyText
  }
}
