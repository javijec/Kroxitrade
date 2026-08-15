import { settings } from "~/lib/services/settings"

const loadFinerFilters = () =>
  import("~/lib/features/finer-filters").then((m) => m.startFinerFilters)
const loadQuickFilters = () =>
  import("~/lib/features/quick-filters").then((m) => m.startQuickFilters)
const loadAutoFuzzy = () =>
  import("~/lib/features/auto-fuzzy").then((m) => m.startAutoFuzzy)

export const startFilterPanel = async (): Promise<() => void> => {
  if ((window as any).__KROX_STARTED__) {
    return () => {}
  }
  ;(window as any).__KROX_STARTED__ = true

  let stopped = false
  const stopByKey = new Map<string, () => void>()
  const state = new Map<string, boolean>()

  const ensure = async (
    key: string,
    enabled: boolean,
    load: () => Promise<() => () => void>
  ) => {
    state.set(key, enabled)
    if (enabled && !stopByKey.has(key)) {
      const start = await load()
      if (stopped || !state.get(key) || stopByKey.has(key)) return
      stopByKey.set(key, start())
    } else if (!enabled && stopByKey.has(key)) {
      stopByKey.get(key)?.()
      stopByKey.delete(key)
    }
  }

  await settings.load()

  const stopFinerFilters = (await loadFinerFilters())()
  void ensure(
    "quick-filters",
    settings.getCurrent().showQuickFilters,
    loadQuickFilters
  )
  void ensure(
    "auto-fuzzy",
    settings.getCurrent().autoFuzzySearch,
    loadAutoFuzzy
  )

  const unsubscribe = settings.subscribe((value) => {
    void ensure("quick-filters", value.showQuickFilters, loadQuickFilters)
    void ensure("auto-fuzzy", value.autoFuzzySearch, loadAutoFuzzy)
  })

  return () => {
    stopped = true
    unsubscribe()
    stopByKey.forEach((stop) => stop())
    stopByKey.clear()
    stopFinerFilters()
  }
}
