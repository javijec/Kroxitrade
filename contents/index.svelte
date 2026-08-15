<script lang="ts">
  import Layout from "~components/Layout.svelte"
  import { pageTitle } from "~lib/services/page-title"
  import { itemResults } from "~lib/features/item-results"
  import { bulkSellers } from "~lib/services/bulk-sellers"
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

  function ensureBulkSellers(enabled: boolean) {
    if (enabled) {
      bulkSellers.start()
    } else {
      bulkSellers.stop()
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

    pageTitle.start()
    void itemResults.start()
    ensureBulkSellers(settings.getCurrent().showBulkSellers)

    const unsubscribeSettings = settings.subscribe((value) => {
      applyTextSize(value.textSize)
      ensureBulkSellers(value.showBulkSellers)
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
      bulkSellers.stop()
      unsubscribeSettings()
      itemResults.stop()
      pageTitle.stop()
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
