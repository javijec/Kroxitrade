const normalizeEnglishTradeText = (value: string): string =>
  value
    .replace(/\[([^\]|]+)(?:\|[^\]]*)?\]/g, "$1")
    .replace(/\{[^}]*\}/g, "#")
    .replace(/[+\-]?\d+(?:\.\d+)?/g, "#")
    .toLowerCase()
    .replace(/[^a-z#]/g, "")

const resolveTradeDisplayText = (value: string): string =>
  value
    .replace(/\[([^[\]|]*)\|([^[\]]*)\]/g, "$2")
    .replace(/\[([^[\]]*)\]/g, "$1")

export type TradeStatOption = { id?: number | string; text?: string }
export type TradeStatEntry = {
  id?: string
  text?: string
  type?: string
  option?: { options?: TradeStatOption[] }
}
export type TradeStatGroup = {
  id?: string
  label?: string
  entries?: TradeStatEntry[]
}
export type ModifierTranslation = {
  tw: string
  us?: string
  opt?: Record<string, string>
}

export type ChineseStatTemplates = {
  tw?: Record<string, string>
  cn?: Record<string, string>
}

/**
 * Combines the complete international stat list with Chinese display text.
 * IDs and option values always remain the official international values, so a
 * translated filter produces the same API query as its English equivalent.
 */
export const buildLocalizedStatCache = (
  taiwanStats: TradeStatGroup[],
  internationalStats: TradeStatGroup[] | null,
  templates: ChineseStatTemplates,
  language: "tw" | "cn"
): TradeStatGroup[] => {
  if (!internationalStats) return taiwanStats

  const chineseById: Record<string, TradeStatEntry> = {}
  const groupLabelById: Record<string, string> = {}
  const entryLabelById: Record<string, string> = {}
  for (const group of taiwanStats) {
    if (group.id && group.label) groupLabelById[group.id] = group.label
    for (const entry of group.entries ?? []) {
      if (!entry.id) continue
      chineseById[entry.id] = entry
      if (group.label) entryLabelById[entry.id] = group.label
    }
  }

  const result = internationalStats.map((group) => ({
    ...group,
    label: (group.id && groupLabelById[group.id]) || group.label,
    entries: (group.entries ?? []).map((entry) => {
      const taiwanEntry = entry.id ? chineseById[entry.id] : undefined
      const fallback = entry.text
        ? templates[language]?.[normalizeEnglishTradeText(entry.text)]
        : undefined
      const chineseText = taiwanEntry?.text || fallback
      const text = chineseText
        ? `${resolveTradeDisplayText(chineseText)} (${entry.text ?? ""})`
        : entry.text

      const taiwanOptions = new Map<string, string>()
      for (const option of taiwanEntry?.option?.options ?? []) {
        if (option.id != null && option.text) {
          taiwanOptions.set(String(option.id), resolveTradeDisplayText(option.text))
        }
      }
      const option = entry.option?.options
        ? {
            options: entry.option.options.map((candidate) => {
              const translated =
                candidate.id == null ? undefined : taiwanOptions.get(String(candidate.id))
              return translated && translated !== candidate.text
                ? { ...candidate, text: `${translated} (${candidate.text ?? ""})` }
                : candidate
            })
          }
        : entry.option

      return {
        ...entry,
        text,
        option,
        type: (entry.id && entryLabelById[entry.id]) || group.label || entry.type
      }
    })
  }))

  appendTaiwanOnlyOptions(result, taiwanStats, internationalStats)
  return result
}

/**
 * Localize an item dataset by stable entry id without changing the value that
 * Trade sends back to its API. Trade2 uses the same group/entry shape as PoE1.
 */
export const buildLocalizedItemCache = (
  taiwanItems: TradeStatGroup[],
  internationalItems: TradeStatGroup[] | null,
  language: "tw" | "cn"
): TradeStatGroup[] => {
  if (!internationalItems) return taiwanItems

  const chineseGroups = new Map(taiwanItems.map((group) => [group.id, group]))
  return internationalItems.map((group) => {
    const localizedGroup = chineseGroups.get(group.id)
    const chineseEntries = new Map(
      (localizedGroup?.entries ?? [])
        .filter((entry) => entry.id)
        .map((entry) => [entry.id as string, entry])
    )
    return {
      ...group,
      label: localizedGroup?.label || group.label,
      entries: (group.entries ?? []).map((entry) => {
        const localized = entry.id ? chineseEntries.get(entry.id) : undefined
        if (!localized?.text || localized.text === entry.text) return entry
        const english = entry.text ?? entry.type ?? ""
        const chinese = language === "cn" ? localized.text : localized.text
        return { ...entry, text: `${chinese} (${english})` }
      })
    }
  })
}

/** Preserve Taiwan-only flattened options in the API-safe base-id form. */
const appendTaiwanOnlyOptions = (
  result: TradeStatGroup[],
  taiwanStats: TradeStatGroup[],
  internationalStats: TradeStatGroup[]
) => {
  const internationalIds = new Set<string>()
  for (const group of internationalStats) {
    for (const entry of group.entries ?? []) if (entry.id) internationalIds.add(entry.id)
  }

  type PendingOption = {
    groupId?: string
    type?: string
    labels: string[]
    options: TradeStatOption[]
  }
  const pending: Record<string, PendingOption> = {}
  for (const group of taiwanStats) {
    for (const entry of group.entries ?? []) {
      if (!entry.id || internationalIds.has(entry.id)) continue
      const match = entry.id.match(/^(.*)\|(\d+)$/)
      if (!match || internationalIds.has(match[1])) continue
      const next =
        pending[match[1]] ??
        (pending[match[1]] = {
          groupId: group.id,
          type: group.label,
          labels: [],
          options: []
        })
      const label = resolveTradeDisplayText(entry.text ?? "")
      if (label) next.labels.push(label)
      next.options.push({ id: Number(match[2]), text: label })
    }
  }

  const groupById = new Map(result.flatMap((group) => (group.id ? [[group.id, group]] : [])))
  for (const [id, next] of Object.entries(pending)) {
    const target = (next.groupId && groupById.get(next.groupId)) || result[0]
    if (!target) continue
    const label = commonPrefix(next.labels)
    ;(target.entries ??= []).push({
      id,
      text: label || next.labels[0] || id,
      type: next.type,
      option: { options: next.options }
    })
  }
}

const commonPrefix = (values: string[]) => {
  if (!values.length) return ""
  let prefix = values[0]
  for (const value of values.slice(1)) {
    let cursor = 0
    while (cursor < prefix.length && cursor < value.length && prefix[cursor] === value[cursor]) {
      cursor++
    }
    prefix = prefix.slice(0, cursor)
    if (!prefix) break
  }
  return prefix.trim()
}

/** Pair localized item-result modifiers using stable Trade stat ids. */
export const buildModifierTranslationMap = (
  taiwanStats: TradeStatGroup[],
  internationalStats: TradeStatGroup[] | null
): Record<string, ModifierTranslation> => {
  const englishById = new Map<string, TradeStatEntry>()
  for (const group of internationalStats ?? []) {
    for (const entry of group.entries ?? []) if (entry.id) englishById.set(entry.id, entry)
  }

  const result: Record<string, ModifierTranslation> = {}
  for (const group of taiwanStats) {
    if (group.id === "pseudo") continue
    for (const entry of group.entries ?? []) {
      if (!entry.id || !entry.text || result[entry.id]) continue
      const english = englishById.get(entry.id)
      const translation: ModifierTranslation = { tw: entry.text, us: english?.text }
      const englishOptions = new Map(
        (english?.option?.options ?? [])
          .filter((option) => option.id != null && option.text)
          .map((option) => [String(option.id), option.text as string])
      )
      const options: Record<string, string> = {}
      for (const option of entry.option?.options ?? []) {
        if (option.id == null || !option.text) continue
        const englishText = englishOptions.get(String(option.id))
        if (englishText) options[englishText] = option.text
      }
      if (Object.keys(options).length) translation.opt = options
      result[entry.id] = translation
    }
  }
  return result
}
