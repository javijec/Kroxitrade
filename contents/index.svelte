<script lang="ts">
  import type { PlasmoCSConfig, PlasmoGetInlineAnchor, PlasmoGetStyle } from "plasmo"
  import Layout from "~components/Layout.svelte"
  import cssText from "data-text:~lib/styles/base.scss"
  import enhancementsCss from "data-text:~lib/styles/enhancements.scss"
  import { bulkSellersService } from "~lib/services/bulk-sellers"
  import { pageTitleService } from "~lib/services/page-title"
  import { itemResultsService } from "~lib/services/item-results"
  import { onMount } from "svelte"

  const EXTENSION_WIDTH = "360px"

  export const config: PlasmoCSConfig = {
    matches: ["https://*.pathofexile.com/trade*"]
  }

  export const getStyle: PlasmoGetStyle = () => {
    const style = document.createElement("style")
    style.textContent = cssText
    return style
  }

  export const getInlineAnchor: PlasmoGetInlineAnchor = async () => ({
    element: document.body,
    insertPosition: "afterbegin"
  })

  onMount(() => {
    if (!document.body) {
      return
    }

    const styleEl = document.createElement("style")
    styleEl.id = "bt-enhancement-styles"
    styleEl.textContent = enhancementsCss
    document.head.appendChild(styleEl)
    document.documentElement.style.setProperty("--bt-sidebar-width", EXTENSION_WIDTH)
    document.documentElement.classList.add("bt-has-kroxitrade-sidebar")
    document.body.classList.add("bt-has-kroxitrade-sidebar")

    pageTitleService.initialize()
    void itemResultsService.initialize()
    bulkSellersService.initialize()

    const handleMessage = (request: { query?: string; itemId?: string }) => {
      if (request.query !== "scroll-to-item" || !request.itemId) {
        return
      }

      const el = document.querySelector<HTMLElement>(`.row[data-id="${request.itemId}"]`)
      if (!el) {
        return
      }

      el.scrollIntoView({ block: "center", behavior: "smooth" })
      el.classList.add("bt-pinned-glow")
      window.setTimeout(() => el.classList.remove("bt-pinned-glow"), 2000)
    }

    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
      document.documentElement.style.removeProperty("--bt-sidebar-width")
      document.documentElement.classList.remove("bt-has-kroxitrade-sidebar")
      document.body.classList.remove("bt-has-kroxitrade-sidebar")
      document.getElementById("bt-enhancement-styles")?.remove()
    }
  })
</script>

<Layout />
