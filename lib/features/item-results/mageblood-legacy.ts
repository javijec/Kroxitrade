// Mageblood "Legacy of X" mod detection and the data used to explain each
// legacy variant. Kept as pure module-level data/helpers so the
// ItemResultsService stays focused on orchestrating result-row enhancement.

import type { MagebloodLegacyLocale } from "../../data/mageblood-legacy-texts"

export interface LegacyEffect {
  stats: Array<[number, string]>
}

export interface MagebloodLegacy {
  mod: HTMLElement
  key: string
  title: string
}

export const MAGEBLOOD_LEGACY_EFFECTS: Record<string, LegacyEffect> = {
  amethyst: { stats: [[45, "% to Chaos Resistance"]] },
  basalt: { stats: [[150, "% increased Armour"]] },
  bismuth: { stats: [[45, "% to all Elemental Resistances"]] },
  diamond: { stats: [[75, "% increased Critical Hit Chance"]] },
  gold: { stats: [[45, "% increased Rarity of Items found"]] },
  granite: { stats: [[2000, " to Armour"]] },
  jade: { stats: [[2000, " to Evasion Rating"]] },
  quicksilver: { stats: [[30, "% increased Movement Speed"]] },
  ruby: {
    stats: [
      [60, "% to Fire Resistance"],
      [5, "% to Maximum Fire Resistance"]
    ]
  },
  sapphire: {
    stats: [
      [60, "% to Cold Resistance"],
      [5, "% to Maximum Cold Resistance"]
    ]
  },
  silver: { stats: [[30, "% increased Skill Speed"]] },
  stibnite: { stats: [[150, "% increased Evasion Rating"]] },
  sulphur: { stats: [[60, "% increased Damage"]] },
  topaz: {
    stats: [
      [60, "% to Lightning Resistance"],
      [5, "% to Maximum Lightning Resistance"]
    ]
  }
}

export const MAGEBLOOD_LEGACY_VARIANTS: Record<string, string> = {
  "1": "amethyst",
  "2": "basalt",
  "3": "bismuth",
  "4": "diamond",
  "5": "gold",
  "6": "granite",
  "7": "jade",
  "8": "quicksilver",
  "9": "ruby",
  "10": "sapphire",
  "11": "silver",
  "12": "stibnite",
  "13": "sulphur",
  "14": "topaz"
}

export const MAGEBLOOD_LEGACY_ALIASES: Record<string, string> = {
  amatista: "amethyst",
  basalto: "basalt",
  bismuto: "bismuth",
  diamante: "diamond",
  oro: "gold",
  granito: "granite",
  jade: "jade",
  celeridad: "quicksilver",
  rubi: "ruby",
  rubí: "ruby",
  zafiro: "sapphire",
  plata: "silver",
  antimonio: "stibnite",
  azufre: "sulphur",
  topacio: "topaz",
  mercurio: "quicksilver",
  estibina: "stibnite",
  ametista: "amethyst",
  ouro: "gold",
  safira: "sapphire",
  prata: "silver",
  enxofre: "sulphur"
}

export const MAGEBLOOD_LEGACY_FIELD_PATTERN =
  /stat\.explicit\.stat_264262054\|(\d+)/
export const MAGEBLOOD_DUPLICATE_FIELD = "stat.explicit.stat_3874491706"
export const MAGEBLOOD_LEGACY_PATTERN =
  /^(?:Legacy of|Legado de|มรดกแห่ง) (.+)$/i
export const MAGEBLOOD_DUPLICATE_PATTERN =
  /(?:Mage(?:'|\u2019)?s Legacies have (\d+)% increased effect per duplicate|legados de mago.*efecto aumentado un (\d+)%.*legado de mago duplicado)/i
export const MAGEBLOOD_LEGACY_CLASS = "bt-mb-legacy"
export const MAGEBLOOD_EXPLANATIONS_CLASS = "bt-mb-explanations"

export const normalizeMagebloodLegacyKey = (name: string) => {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
  return MAGEBLOOD_LEGACY_ALIASES[normalized] || normalized
}

export const titleCaseLegacyName = (name: string) =>
  name.charAt(0).toUpperCase() + name.slice(1)

export const getMagebloodLegacyLocale = (): MagebloodLegacyLocale => {
  const host = window.location.hostname.toLowerCase()
  if (host === "poe.kakaogames.com" || host === "poe2.kakaogames.com")
    return "ko"
  if (host === "pathofexile.tw") return "zh-tw"
  const subdomain = host.split(".")[0]
  if (subdomain === "br") return "pt"
  if (subdomain === "jp") return "jp"
  if (["es", "pt", "ru", "th", "de", "fr"].includes(subdomain)) {
    return subdomain as MagebloodLegacyLocale
  }
  return "en"
}

export const getMagebloodLegacyBaseLabel = (locale: MagebloodLegacyLocale) =>
  ({
    en: "base",
    es: "base",
    pt: "base",
    ru: "база",
    th: "ฐาน",
    de: "Basis",
    fr: "base",
    jp: "基礎",
    ko: "기본",
    "zh-tw": "基礎"
  })[locale]

export const getMagebloodLegacyEffectLabel = (locale: MagebloodLegacyLocale) =>
  ({
    en: "effect",
    es: "de efecto",
    pt: "de efeito",
    ru: "эффекта",
    th: "ผล",
    de: "Effekt",
    fr: "d'effet",
    jp: "効果",
    ko: "효과",
    "zh-tw": "效果"
  })[locale]

export const formatMagebloodLegacyLine = (template: string, value: number) =>
  template.replace("{value}", `${value}`)
