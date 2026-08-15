import { startAutoFuzzy } from "~/lib/features/auto-fuzzy"
import { startFinerFilters } from "~/lib/features/finer-filters"
import { startQuickFilters } from "~/lib/features/quick-filters"

export const startFilterPanel = (): (() => void) => {
  if ((window as any).__KROX_STARTED__) {
    return () => {}
  }

  ;(window as any).__KROX_STARTED__ = true

  const stops = [startFinerFilters(), startQuickFilters(), startAutoFuzzy()]
  return () => stops.forEach((stop) => stop())
}
