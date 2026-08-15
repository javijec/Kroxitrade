import type { FeatureLifecycle } from "~/lib/core/feature-lifecycle"
import { settings } from "~/lib/services/settings"

const loadFinerFilters = () =>
  import("~/lib/features/finer-filters").then((m) => m.createFinerFilters())
const loadQuickFilters = () =>
  import("~/lib/features/quick-filters").then((m) => m.createQuickFilters())
const loadAutoFuzzy = () =>
  import("~/lib/features/auto-fuzzy").then((m) => m.createAutoFuzzy())

let started = false

export const startFilterPanel = async (): Promise<() => void> => {
  if (started) return () => {}
  started = true

  let stopped = false
  const features = new Map<string, FeatureLifecycle>()
  const enabledByKey = new Map<string, boolean>()

  const ensure = async (
    key: string,
    enabled: boolean,
    load: () => Promise<FeatureLifecycle>
  ) => {
    enabledByKey.set(key, enabled)
    if (enabled && !features.has(key)) {
      const feature = await load()
      if (stopped || !enabledByKey.get(key) || features.has(key)) return
      features.set(key, feature)
      feature.start()
    } else if (!enabled && features.has(key)) {
      features.get(key)?.stop()
      features.delete(key)
    }
  }

  await settings.load()

  // Finer Filters is always on; the other features follow their settings.
  void ensure("finer-filters", true, loadFinerFilters)
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
    if (stopped) return
    stopped = true
    unsubscribe()
    features.forEach((feature) => feature.stop())
    features.clear()
    started = false
  }
}
