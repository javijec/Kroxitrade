// Typed backend for the Trade site's stat-filter interaction. The site builds
// its search query from Vue component state, so the filter groups are mutated
// through the site's own component methods (selectFilter / updateFilter /
// removeFilter) and the search is triggered via the app's save(). The Vue root
// (window.app) is reached only inside this module, never from features.
//
// Features go through the `tradeFilters` adapter below, which exposes the
// Trade site as a plain TradeFiltersAdapter and keeps every Vue concept out of
// the feature layer.

export interface PoeFilter {
  id: string
  value: Record<string, number | undefined>
  disabled: boolean
}

export interface PoeVueFilterGroup extends PoeVueNode {
  index: number
  type: "and" | "not"
  filters: PoeFilter[]
  state: {
    filters: Array<{ value: Record<string, number | undefined> }>
  }
  selectFilter?: (filter: PoeFilter | "") => void
  removeFilter?: (index: number) => void
  updateFilter?: (index: number, value: { min?: number; max?: number }) => void
}

interface PoeVueNode {
  $vnode?: { tag?: string }
  $children?: PoeVueNode[]
  group?: { type: "and" | "not" }
}

interface PoeVueRoot extends PoeVueNode {
  save?: (reload?: boolean) => void
  $store?: {
    commit?: (
      mutation: "pushStatGroup",
      payload: {
        type: "and" | "not"
        filters: Array<PoeFilter | "">
      }
    ) => void
  }
}

interface PoeVueResultPanel extends PoeVueNode {
  search?: () => void
}

const finder = (vm: PoeVueNode, v: string) => !!vm.$vnode?.tag?.includes?.(v)

const getGlobalApp = (): PoeVueRoot | undefined =>
  (window as { app?: PoeVueRoot }).app

const findVueItem = (tags: string[]): PoeVueNode | undefined =>
  tags.reduce<PoeVueNode | undefined>(
    (acc, tag) => acc?.$children?.find((child) => finder(child, tag)),
    getGlobalApp()
  )

export const getItemResultPanel = (): PoeVueResultPanel | undefined =>
  findVueItem(["item-results-panel"]) as PoeVueResultPanel | undefined

export const getStatFilterGroups = (
  type?: "and" | "not"
): PoeVueFilterGroup[] => {
  const panel = findVueItem(["item-search-panel", "item-filter-panel"])
  return (panel?.$children?.filter(
    (child) =>
      finder(child, "stat-filter-group") &&
      (type ? child.group?.type === type : true)
  ) || []) as PoeVueFilterGroup[]
}

export const createFilter = (id: string): PoeFilter | "" =>
  id ? { id, value: {}, disabled: false } : ""

export const pushStatGroup = (
  type: "and" | "not",
  filters: Array<PoeFilter | "">
) => {
  getGlobalApp()?.$store?.commit?.("pushStatGroup", { type, filters })
}

export const hasTradeVueApp = () => !!getGlobalApp()

export const saveSearch = () => getGlobalApp()?.save?.(true)

export const refreshResults = () => getItemResultPanel()?.search?.()

// ---------------------------------------------------------------------------
// Feature-facing adapter. Features never touch PoeVue* or window.app; they work
// with TradeFilterGroup views and let the adapter resolve them back to the
// site's live state.

export type TradeFilterType = "and" | "not"

export interface TradeFilter {
  id: string
  value: { min?: number; max?: number }
}

export interface TradeFilterGroup {
  index: number
  type: TradeFilterType
  filters: TradeFilter[]
}

export interface TradeFiltersAdapter {
  isAvailable(): boolean
  getFilters(type?: TradeFilterType): TradeFilterGroup[]
  addFilter(
    hash: string,
    type: TradeFilterType,
    group?: TradeFilterGroup
  ): boolean
  updateFilter(
    group: TradeFilterGroup,
    index: number,
    value: { min?: number; max?: number }
  ): boolean
  removeFilter(group: TradeFilterGroup, index: number): boolean
  save(): void
  refresh(): void
}

const toTradeGroup = (group: PoeVueFilterGroup): TradeFilterGroup => ({
  index: group.index,
  type: group.type,
  filters: group.filters.map((filter, index) => ({
    id: filter.id,
    value: group.state?.filters?.[index]?.value ?? {}
  }))
})

const resolveGroup = (group: TradeFilterGroup): PoeVueFilterGroup | undefined =>
  getStatFilterGroups(group.type).find((g) => g.index === group.index)

export const tradeFilters: TradeFiltersAdapter = {
  isAvailable: () => hasTradeVueApp(),

  getFilters: (type) => getStatFilterGroups(type).map(toTradeGroup),

  addFilter(hash, type, target) {
    const live = target
      ? resolveGroup(target)
      : getStatFilterGroups(type).find((group) => group.index !== 0)
    if (live?.selectFilter) {
      live.selectFilter(createFilter(hash))
    } else {
      pushStatGroup(type, [createFilter(hash)])
    }
    return true
  },

  updateFilter(group, index, value) {
    const live = resolveGroup(group)
    live?.updateFilter?.(index, value)
    return !!live
  },

  removeFilter(group, index) {
    const live = resolveGroup(group)
    live?.removeFilter?.(index)
    return !!live
  },

  save: () => saveSearch(),
  refresh: () => refreshResults()
}
