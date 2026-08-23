import type { FeatureLifecycle } from "~/lib/core/feature-lifecycle"
import { extensionBus } from "~/lib/core/extension-bus"
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

  try {
    await settings.load()
  } catch (error) {
    // Never leave the panel stuck half-started: a failed load must allow a
    // retry on the next call.
    started = false
    throw error
  }

  // Finer Filters and Quick Filters stay active on the page; Auto Fuzzy follows
  // its setting.
  void ensure("finer-filters", true, loadFinerFilters)
  // Keep the page feature alive independently of the synced setting. It owns
  // the local page-side visibility/placement keys and removes its own UI when
  // disabled. Gating it here can leave the page without an injector after a
  // sync update races the MAIN-world startup.
  void ensure("quick-filters", true, loadQuickFilters)
  void ensure(
    "auto-fuzzy",
    settings.getCurrent().autoFuzzySearch,
    loadAutoFuzzy
  )

  const unsubscribe = settings.subscribe((value) => {
    extensionBus.send("quick-filters:change")
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
