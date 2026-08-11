import {
  hasValidExtensionContext,
  isExtensionContextInvalidatedError
} from "../utilities/extension-context"

const TRADE_URL_PATTERN =
  /^https:\/\/(?:(?:[^./]+\.)?pathofexile\.com|pathofexile\.tw|poe(?:2)?\.kakaogames\.com)\/trade(?:2)?(?:\/|$)/i

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

export const openUrlInNewTab = async (url: string) => {
  // Open inactive so repeated middle-clicks can queue searches without taking
  // focus away from the bookmark panel or the current trade search.
  if (hasValidExtensionContext() && chrome.tabs?.create) {
    try {
      await chrome.tabs.create({ url, active: false })
      return
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.warn("[Poe Trade Plus] Failed to open a new tab", error)
      }
    }
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
