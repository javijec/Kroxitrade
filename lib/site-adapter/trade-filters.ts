// Typed backend for the Trade site's stat-filter interaction. The site builds
// its search query from Vue component state, so the filter groups are mutated
// through the site's own component methods (selectFilter / updateFilter /
// removeFilter) and the search is triggered via the app's save(). The Vue root
// (window.app) is reached only inside this module, never from features.

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

const finder = (vm: PoeVueNode, v: string) =>
  !!vm.$vnode?.tag?.includes?.(v)

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
