import {
  hasValidExtensionContext,
  isExtensionContextInvalidatedError
} from "../utilities/extension-context"

const BOOKMARK_SCROLL_RESTORE_KEY_PREFIX = "bookmark-scroll-restore--"
export const BOOKMARK_SCROLL_RESTORE_MAX_AGE_MS = 30_000

export const bookmarkScrollMessage = {
  save: "poeTradePlus.bookmarkScroll.save",
  consume: "poeTradePlus.bookmarkScroll.consume",
  clear: "poeTradePlus.bookmarkScroll.clear"
} as const

type BookmarkScrollRestore = {
  top: number
  savedAt: number
}

export const getBookmarkScrollRestoreKey = (tabId: number) =>
  `${BOOKMARK_SCROLL_RESTORE_KEY_PREFIX}${tabId}`

const sendMessage = <T>(message: unknown): Promise<T | null> =>
  new Promise((resolve) => {
    if (!hasValidExtensionContext() || !chrome.runtime?.sendMessage) {
      resolve(null)
      return
    }

    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null)
          return
        }
        resolve((response ?? null) as T | null)
      })
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.warn("[Poe Trade Plus] Failed to restore bookmark scroll", error)
      }
      resolve(null)
    }
  })

export const saveBookmarkScroll = async (top: number) => {
  if (!Number.isFinite(top) || top < 0) return

  await sendMessage({
    type: bookmarkScrollMessage.save,
    value: { top, savedAt: Date.now() } satisfies BookmarkScrollRestore
  })
}

export const consumeBookmarkScroll = async (): Promise<number | null> => {
  const response = await sendMessage<{ top?: unknown }>({
    type: bookmarkScrollMessage.consume
  })
  return typeof response?.top === "number" && Number.isFinite(response.top)
    ? response.top
    : null
}

export const clearBookmarkScroll = async () => {
  await sendMessage({ type: bookmarkScrollMessage.clear })
}
