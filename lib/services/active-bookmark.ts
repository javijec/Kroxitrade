import { writable } from "svelte/store"
import {
  hasValidExtensionContext,
  isExtensionContextInvalidatedError
} from "../utilities/extension-context"

const ACTIVE_BOOKMARK_ID_KEY = "poeTradePlus.activeBookmarkId"
const ACTIVE_BOOKMARK_TAB_KEY_PREFIX = "active-bookmark--"
export const ACTIVE_BOOKMARK_RESTORE_MAX_AGE_MS = 30_000

export const activeBookmarkMessage = {
  save: "poeTradePlus.activeBookmark.save",
  consume: "poeTradePlus.activeBookmark.consume"
} as const

type ActiveBookmarkRestore = {
  id: string
  savedAt: number
}

export const getActiveBookmarkTabKey = (tabId: number) =>
  `${ACTIVE_BOOKMARK_TAB_KEY_PREFIX}${tabId}`

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
        console.warn("[Poe Trade Plus] Failed to restore active bookmark", error)
      }
      resolve(null)
    }
  })

const readStoredId = (): string | null => {
  if (typeof sessionStorage === "undefined") return null

  try {
    const value = sessionStorage.getItem(ACTIVE_BOOKMARK_ID_KEY)
    return value || null
  } catch {
    return null
  }
}

const writeStoredId = (id: string | null) => {
  if (typeof sessionStorage === "undefined") return

  try {
    if (id) {
      sessionStorage.setItem(ACTIVE_BOOKMARK_ID_KEY, id)
    } else {
      sessionStorage.removeItem(ACTIVE_BOOKMARK_ID_KEY)
    }
  } catch {
    // Ignore quota / access errors; the in-memory store still updates.
  }
}

const { subscribe, set } = writable<string | null>(readStoredId())

export const setActiveBookmarkId = (id: string | null | undefined) => {
  const nextId = id || null
  writeStoredId(nextId)
  set(nextId)
}

export const clearActiveBookmarkId = () => {
  setActiveBookmarkId(null)
}

export const saveActiveBookmark = async (id: string) => {
  if (!id) return

  await sendMessage({
    type: activeBookmarkMessage.save,
    value: { id, savedAt: Date.now() } satisfies ActiveBookmarkRestore
  })
}

export const saveActiveBookmarkForTab = async (tabId: number, id: string) => {
  if (!Number.isInteger(tabId) || tabId < 0 || !id) return

  await sendMessage({
    type: activeBookmarkMessage.save,
    tabId,
    value: { id, savedAt: Date.now() } satisfies ActiveBookmarkRestore
  })
}

export const hydrateActiveBookmarkFromTab = async () => {
  if (readStoredId()) return

  const response = await sendMessage<{ id?: unknown }>({
    type: activeBookmarkMessage.consume
  })
  if (typeof response?.id === "string" && response.id) {
    setActiveBookmarkId(response.id)
  }
}

export const activeBookmarkId = {
  subscribe
}
