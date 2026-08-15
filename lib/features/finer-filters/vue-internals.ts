// Access to the Trade site's internal Vue instances (window.app). Kept behind
// this module so features do not reach into window.app directly.

const finder = (vm: any, v: string) => vm?.$vnode?.tag?.includes?.(v)
export const getGlobalApp = () => (window as any).app
const findVueItem = (tags: string[]) =>
  tags.reduce(
    (acc, v) => acc?.$children?.find?.((e: any) => finder(e, v)),
    getGlobalApp()
  )
export const ItemResultPanelVueItem = () => findVueItem(["item-results-panel"])
export const findVueResultItem = (_itemId: string) =>
  findVueItem(["item-results-panel", "resultset"])?.$children?.find?.(
    (e: any) => e.itemId === _itemId
  )
export const ItemSearchGroupsVueItems = (_type?: string) => {
  const panel = findVueItem(["item-search-panel", "item-filter-panel"])
  return (
    panel?.$children?.filter?.(
      (e: any) =>
        finder(e, "stat-filter-group") &&
        (_type ? e.group.type === _type : true)
    ) || []
  )
}
export const createFilter = (id: string) =>
  id && { id, value: {}, disabled: false }
