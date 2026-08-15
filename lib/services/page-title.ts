// Page title manager — keeps the browser tab title in sync with the trade
// search's active bookmark or fallback name, and restores it after the site
// overwrites it. Lives as a feature with an explicit start()/stop() lifecycle
// so the sidebar can mount/unmount it without leaking listeners.

import { createFeatureLifecycle, type FeatureLifecycle } from "../core/feature-lifecycle"
import { bookmarksService } from "./bookmarks"
import { searchPanelService } from "./search-panel"
import { tradeLocationService } from "./trade-location"

const WOOP_PREFIX_REGEX = /^\((\d+)\) /
const TITLE_MUTATION_THROTTLE_MS = 250

export const createPageTitle = (): FeatureLifecycle =>
  createFeatureLifecycle("page-title", () => {
    const stops: Array<() => void> = []
    let baseSiteTitle = ""
    let lastWoopCount: number | null = null
    let title: string | null = null
    let throttleTimer: ReturnType<typeof setTimeout> | null = null

    const titleElement = document.querySelector("title")
    if (!titleElement) return () => {}

    baseSiteTitle = document.title

    const updateTitle = () => {
      if (title === null) return
      const woopPrefix = lastWoopCount !== null ? `(${lastWoopCount}) ` : ""
      const newTitle = woopPrefix + title
      if (document.title !== newTitle) {
        document.title = newTitle
      }
    }

    const parseWoopCount = (input: string): number | null => {
      const match = WOOP_PREFIX_REGEX.exec(input)
      if (match) {
        const parsed = parseInt(match[1], 10)
        return isNaN(parsed) ? null : parsed
      }
      return null
    }

    const onDocumentTitleMutation = () => {
      const newWoopCount = parseWoopCount(document.title)
      if (newWoopCount !== lastWoopCount) {
        lastWoopCount = newWoopCount
        updateTitle()
      } else if (
        title &&
        document.title !== title &&
        !document.title.startsWith("(")
      ) {
        // Site reset the title but no new woop: force our title back.
        updateTitle()
      }
    }

    const throttledTitleMutation = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        throttleTimer = null
        onDocumentTitleMutation()
      }, TITLE_MUTATION_THROTTLE_MS)
    }

    const recalculateTitle = async () => {
      const currentLocation = tradeLocationService.current
      const activeBookmark = await bookmarksService.fetchTradeByLocation(currentLocation)

      let activeTradeTitle = ""
      if (activeBookmark) {
        activeTradeTitle = activeBookmark.title
      } else if (currentLocation.type === "search") {
        activeTradeTitle = searchPanelService.recommendTitle() || ""
      }

      const isLiveSegment = currentLocation.isLive ? "⚡ " : ""
      const tradeTitleSegment = activeTradeTitle ? `${activeTradeTitle} - ` : ""

      title = `${isLiveSegment}${tradeTitleSegment}${baseSiteTitle}`
      updateTitle()
    }

    const observer = new MutationObserver(() => throttledTitleMutation())
    observer.observe(titleElement, { childList: true })
    stops.push(() => {
      observer.disconnect()
      if (throttleTimer) {
        clearTimeout(throttleTimer)
        throttleTimer = null
      }
    })

    const unsubscribeBookmarks = bookmarksService.onChange(() =>
      void recalculateTitle()
    )
    const unsubscribeLocation = tradeLocationService.onChange(() =>
      void recalculateTitle()
    )
    stops.push(() => {
      unsubscribeBookmarks()
      unsubscribeLocation()
    })

    void recalculateTitle()

    return () => stops.forEach((stop) => stop())
  })

export const pageTitle = createPageTitle()
