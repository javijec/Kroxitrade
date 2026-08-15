import "~/lib/styles/enhancements.css"

import { initFilterPanel } from "~/contents/filter-panel"
import { tradeHosts } from "~/lib/config/trade-hosts"
import { patchNavigationHistory } from "~/lib/core/trade-navigation"

export default defineContentScript({
  matches: tradeHosts,
  world: "MAIN",

  main() {
    patchNavigationHistory()
    initFilterPanel()
  }
})
