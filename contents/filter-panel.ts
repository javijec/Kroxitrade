import { initAutoFuzzy } from "~/lib/features/auto-fuzzy"
import { initFinerFilters } from "~/lib/features/finer-filters"
import { initQuickFilters } from "~/lib/features/quick-filters"

export const initFilterPanel = () => {
  if ((window as any).__KROX_STARTED__) {
    return
  }

  ;(window as any).__KROX_STARTED__ = true

  initFinerFilters()
  initQuickFilters()
  initAutoFuzzy()
}
