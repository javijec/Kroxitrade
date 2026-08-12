import {
  hasValidExtensionContext,
  isExtensionContextInvalidatedError
} from "../utilities/extension-context"
import { saveBookmarkScrollForTab } from "./bookmark-scroll"

const TRADE_URL_PATTERN =
  /^https:\/\/(?:(?:[^./]+\.)?pathofexile\.com|pathofexile\.tw|poe(?:2)?\.kakaogames\.com)\/trade(?:2)?(?:\/|$)/i

export const tabsCreateMessage = {
  create: "poeTradePlus.tabs.create"
} as const

const getActiveTab = async () => {
  if (!hasValidExtensionContext() || !chrome.tabs?.query) {
    return null
  }

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })

    return tab ?? null
  } catch (error) {
    if (!isExtensionContextInvalidatedError(error)) {
      console.warn("[Poe Trade Plus] Failed to query active tab", error)
    }
    return null
  }
}

export const getActiveTradeTab = async () => {
  const tab = await getActiveTab()
  if (!tab?.url || !TRADE_URL_PATTERN.test(tab.url)) {
    return null
  }

  return tab
}

export const getActiveTradeTabTitle = async () => {
  const tab = await getActiveTradeTab()
  return tab?.title ?? null
}

export const openUrlInActiveTab = async (url: string) => {
  const tab = await getActiveTab()

  // Background script / popup script case
  if (
    hasValidExtensionContext() &&
    chrome.tabs?.update &&
    typeof tab?.id === "number"
  ) {
    try {
      await chrome.tabs.update(tab.id, { url, active: true })
      return
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.warn("[Poe Trade Plus] Failed to update active tab", error)
      }
    }
  }

  // Content script case - navigate the current page directly
  if (typeof window !== "undefined") {
    window.location.href = url
    return
  }

  // Final fallback
  if (typeof globalThis.open === "function") {
    globalThis.open(url, "_blank", "noopener")
  }
}

const requestTabCreate = (
  url: string,
  active: boolean,
  bookmarkId?: string,
  scrollTop?: number
): Promise<boolean> =>
  new Promise((resolve) => {
    if (!hasValidExtensionContext() || !chrome.runtime?.sendMessage) {
      resolve(false)
      return
    }

    try {
      chrome.runtime.sendMessage(
        { type: tabsCreateMessage.create, url, active, bookmarkId, scrollTop },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(false)
            return
          }
          resolve(!!response?.ok)
        }
      )
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.warn("[Poe Trade Plus] Failed to request a new tab", error)
      }
      resolve(false)
    }
  })

export const openUrlInNewTab = async (
  url: string,
  active = false,
  bookmarkId?: string,
  scrollTop?: number
) => {
  // Prefer chrome.tabs when available (popup / background). Content scripts
  // lack tabs API access, so they ask the background to create the tab with
  // the requested focus so middle-click can stay in the background.
  if (hasValidExtensionContext() && chrome.tabs?.create) {
    try {
      const tab = await chrome.tabs.create({ url, active })
      if (typeof tab.id === "number" && typeof scrollTop === "number") {
        await saveBookmarkScrollForTab(tab.id, scrollTop)
      }
      return
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.warn("[Poe Trade Plus] Failed to open a new tab", error)
      }
    }
  }

  if (await requestTabCreate(url, active, bookmarkId, scrollTop)) {
    return
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener")
  }
}

export const openUrlInNewWindow = async (url: string) => {
  if (hasValidExtensionContext() && chrome.windows?.create) {
    try {
      await chrome.windows.create({ url, type: "normal", focused: true })
      return
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.warn("[Poe Trade Plus] Failed to open a new window", error)
      }
    }
  }

  // Content scripts cannot access chrome.windows. Ask the background worker,
  // where the Windows API is available, before falling back to window.open.
  if (hasValidExtensionContext() && chrome.runtime?.sendMessage) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "open-url-in-new-window",
        url
      })
      if (response?.ok) return
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.warn("[Poe Trade Plus] Failed to request a new window", error)
      }
    }
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

export const sendMessageToActiveTradeTab = async <T>(message: unknown) => {
  const tab = await getActiveTradeTab()

  if (!tab?.id || !hasValidExtensionContext() || !chrome.tabs?.sendMessage) {
    return null
  }

  try {
    return (await chrome.tabs.sendMessage(tab.id, message)) as T
  } catch (error) {
    if (!isExtensionContextInvalidatedError(error)) {
      console.warn(
        "[Poe Trade Plus] Failed to send message to active trade tab",
        error
      )
    }
    return null
  }
}
