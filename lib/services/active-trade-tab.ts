import { hasValidExtensionContext, isExtensionContextInvalidatedError } from "../utilities/extension-context"

const TRADE_URL_PATTERN = /^https:\/\/(?:[^./]+\.)?pathofexile\.com\/trade(?:\/|$)/i

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
  if (hasValidExtensionContext() && chrome.tabs?.update && typeof tab?.id === "number") {
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

export const sendMessageToActiveTradeTab = async <T>(message: unknown) => {
  const tab = await getActiveTradeTab()

  if (!tab?.id || !hasValidExtensionContext() || !chrome.tabs?.sendMessage) {
    return null
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message) as T
  } catch (error) {
    if (!isExtensionContextInvalidatedError(error)) {
      console.warn("[Poe Trade Plus] Failed to send message to active trade tab", error)
    }
    return null
  }
}
