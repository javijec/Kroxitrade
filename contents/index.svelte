<script lang="ts">
  import type { PlasmoCSConfig, PlasmoGetInlineAnchor, PlasmoGetStyle } from "plasmo"
  import Layout from "~components/Layout.svelte"
  import cssText from "data-text:~lib/styles/base.scss"
  import enhancementsCss from "data-text:~lib/styles/enhancements.scss"
  import { bulkSellersService } from "~lib/services/bulk-sellers"
  import { pageTitleService } from "~lib/services/page-title"
  import { itemResultsService } from "~lib/services/item-results"
  import { settings } from "~lib/services/settings"
  import { onMount } from "svelte"

  const EXTENSION_WIDTH = "360px"

  export const config: PlasmoCSConfig = {
    matches: [
      "https://www.pathofexile.com/trade*",
      "https://br.pathofexile.com/trade*",
      "https://ru.pathofexile.com/trade*",
      "https://th.pathofexile.com/trade*",
      "https://de.pathofexile.com/trade*",
      "https://fr.pathofexile.com/trade*",
      "https://es.pathofexile.com/trade*",
      "https://jp.pathofexile.com/trade*",
      "https://poe.game.daum.net/trade*"
    ]
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

  onMount(async () => {
    if (!document.body) {
      return
    }

    await settings.load()

    const styleEl = document.createElement("style")
    styleEl.id = "bt-enhancement-styles"
    styleEl.textContent = enhancementsCss
    document.head.appendChild(styleEl)
    document.documentElement.style.setProperty("--bt-sidebar-width", EXTENSION_WIDTH)
    document.documentElement.classList.add("bt-has-kroxitrade-sidebar")
    document.body.classList.add("bt-has-kroxitrade-sidebar")

    pageTitleService.initialize()
    void itemResultsService.initialize()
    if (settings.getCurrent().showBulkSellers) {
      bulkSellersService.initialize()
    }

    const unsubscribeSettings = settings.subscribe((value) => {
      if (value.showBulkSellers) {
        bulkSellersService.initialize()
        return
      }

      bulkSellersService.teardown()
    })

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
      unsubscribeSettings()
      bulkSellersService.teardown()
      chrome.runtime.onMessage.removeListener(handleMessage)
      document.documentElement.style.removeProperty("--bt-sidebar-width")
      document.documentElement.classList.remove("bt-has-kroxitrade-sidebar")
      document.body.classList.remove("bt-has-kroxitrade-sidebar")
      document.getElementById("bt-enhancement-styles")?.remove()
    }
  })
</script>

<Layout />
