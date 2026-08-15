<script lang="ts">
  import Layout from "~components/Layout.svelte"
  import { pageTitleService } from "~lib/services/page-title"
  import { itemResultsService } from "~lib/features/item-results"
  import { settings } from "~lib/services/settings"
  import { hasValidExtensionContext, isExtensionContextInvalidatedError } from "~lib/utilities/extension-context"
  import { escapeCssAttributeValue } from "~lib/utilities/css"
  import { onMount } from "svelte"

  const EXTENSION_WIDTH = "360px"
  const TEXT_SIZE_SCALE = {
    small: "0.92",
    medium: "1",
    large: "1.18",
    extraLarge: "1.34"
  } as const

  let bulkSellersEnabled = false
  let bulkSellersStop: (() => void) | null = null

  async function ensureBulkSellers(enabled: boolean) {
    bulkSellersEnabled = enabled
    if (enabled && !bulkSellersStop) {
      const { bulkSellersService } = await import("~lib/services/bulk-sellers")
      if (!bulkSellersEnabled) return
      bulkSellersService.initialize()
      bulkSellersStop = () => bulkSellersService.teardown()
    } else if (!enabled && bulkSellersStop) {
      bulkSellersStop()
      bulkSellersStop = null
    }
  }

  function applyTextSize(textSize: keyof typeof TEXT_SIZE_SCALE) {
    document.documentElement.style.setProperty("--bt-text-scale", TEXT_SIZE_SCALE[textSize])
  }

  onMount(async () => {
    if (!document.body) {
      return
    }

    await settings.load()
    document.documentElement.style.setProperty("--bt-sidebar-width", EXTENSION_WIDTH)
    applyTextSize(settings.getCurrent().textSize)
    document.documentElement.classList.add("bt-has-kroxitrade-sidebar")
    document.body.classList.add("bt-has-kroxitrade-sidebar")

    pageTitleService.initialize()
    void itemResultsService.initialize()
    void ensureBulkSellers(settings.getCurrent().showBulkSellers)

    const unsubscribeSettings = settings.subscribe((value) => {
      applyTextSize(value.textSize)
      void ensureBulkSellers(value.showBulkSellers)
    })

    const handleMessage = (request: { query?: string; itemId?: string }) => {
      if (request.query !== "scroll-to-item" || !request.itemId) {
        return
      }

      const itemId = escapeCssAttributeValue(request.itemId)
      const el = document.querySelector<HTMLElement>(
        `[data-bt-pin-id="${itemId}"], .result-item[data-id="${itemId}"], .row[data-id="${itemId}"]`
      )
      if (!el) {
        return
      }

      el.scrollIntoView({ block: "center", behavior: "smooth" })
      el.classList.add("bt-pinned-glow")
      window.setTimeout(() => el.classList.remove("bt-pinned-glow"), 2000)
    }

    if (hasValidExtensionContext()) {
      try {
        chrome.runtime.onMessage.addListener(handleMessage)
      } catch (error) {
        if (!isExtensionContextInvalidatedError(error)) {
          console.warn("[Poe Trade Plus] Failed to attach runtime listener", error)
        }
      }
    }

    return () => {
      bulkSellersEnabled = false
      bulkSellersStop?.()
      bulkSellersStop = null
      unsubscribeSettings()
      itemResultsService.teardown()
      pageTitleService.teardown()
      if (hasValidExtensionContext()) {
        try {
          chrome.runtime.onMessage.removeListener(handleMessage)
        } catch (error) {
          if (!isExtensionContextInvalidatedError(error)) {
            console.warn("[Poe Trade Plus] Failed to detach runtime listener", error)
          }
        }
      }
      document.documentElement.style.removeProperty("--bt-sidebar-width")
      document.documentElement.style.removeProperty("--bt-text-scale")
      document.documentElement.classList.remove("bt-has-kroxitrade-sidebar")
      document.body.classList.remove("bt-has-kroxitrade-sidebar")
    }
  })
</script>

<Layout />
