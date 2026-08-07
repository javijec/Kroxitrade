import {
  hasValidExtensionContext,
  isExtensionContextInvalidatedError
} from "../utilities/extension-context"

interface StoragePayload {
  value: unknown
  expiresAt: string | null
}

export type StorageArea = "local" | "sync"

const SYNC_VALUE_FORMAT = 1
const COMPRESSED_SYNC_VALUE_FORMAT = 2
const SYNC_RECOVERY_SNAPSHOT_KEY = "poe-trade-plus-sync-recovery"
const SYNC_RECOVERY_DELAY_MS = 750
const MANAGED_SYNC_KEYS = new Set([
  "app-settings",
  "app-settings-poe1",
  "app-settings-poe2",
  "bookmark-folders",
  "bookmark-folders-manifest"
])
const MANAGED_SYNC_PREFIXES = [
  "bookmark-trades--",
  "bookmark-trades-manifest--",
  "bookmark-trades-chunk--",
  "bookmark-folders-chunk--"
]
const COMPACT_KEYS: Record<string, string> = {
  id: "i",
  title: "t",
  location: "l",
  version: "v",
  type: "y",
  slug: "s",
  league: "g",
  completedAt: "d",
  categoryId: "c",
  categories: "a",
  icon: "o",
  archivedAt: "r",
  sidebarSide: "S",
  sidebarWidth: "W",
  language: "L",
  textSize: "T",
  translateTradeSite: "R",
  showEquivalentPricing: "e",
  showValdoRewardPricing: "z",
  showMagebloodLegacyDescriptions: "m",
  showBulkSellers: "b",
  showHistory: "h",
  showFinerFilters: "f",
  showQuickFilters: "q",
  quickFiltersPlacement: "p",
  autoFuzzySearch: "F",
  compactActionsMenu: "A",
  ultraCompactBookmarks: "u",
  classicBookmarkTradeActions: "C",
  compactBookmarkTradeActions: "B",
  ultraCompactBookmarkTradeActions: "U",
  bookmarkCategoriesEnabled: "k",
  chunkKeys: "K",
  expiresAt: "x",
  value: "V"
}
const EXPANDED_KEYS = Object.fromEntries(
  Object.entries(COMPACT_KEYS).map(([key, compact]) => [compact, key])
)

type SyncRecoverySnapshot = {
  capturedAt: string
  data: Record<string, unknown>
}

const isManagedSyncKey = (key: string) =>
  MANAGED_SYNC_KEYS.has(key) ||
  MANAGED_SYNC_PREFIXES.some((prefix) => key.startsWith(prefix))

const getManagedSyncValues = (values: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(values).filter(([key]) => isManagedSyncKey(key))
  )

const isStoragePayload = (value: unknown): value is StoragePayload =>
  typeof value === "object" &&
  value !== null &&
  "value" in value &&
  "expiresAt" in value &&
  (typeof value.expiresAt === "string" || value.expiresAt === null)

const compactSyncValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(compactSyncValue)
  if (typeof value !== "object" || value === null) return value

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      COMPACT_KEYS[key] || key,
      compactSyncValue(entry)
    ])
  )
}

const expandSyncValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(expandSyncValue)
  if (typeof value !== "object" || value === null) return value

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      EXPANDED_KEYS[key] || key,
      expandSyncValue(entry)
    ])
  )
}

const isEncodedSyncValue = (value: unknown): value is [number, unknown] =>
  Array.isArray(value) &&
  value.length === 2 &&
  (value[0] === SYNC_VALUE_FORMAT || value[0] === COMPRESSED_SYNC_VALUE_FORMAT)

const isCompressedSyncValue = (value: unknown): value is [number, string] =>
  Array.isArray(value) &&
  value.length === 2 &&
  value[0] === COMPRESSED_SYNC_VALUE_FORMAT &&
  typeof value[1] === "string"

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const base64ToBytes = (value: string) =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0))

const gzip = async (value: string) => {
  const stream = new Blob([value])
    .stream()
    .pipeThrough(new CompressionStream("gzip"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const gunzip = async (value: Uint8Array) => {
  const stream = new Blob([new Uint8Array(value).buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  return new Response(stream).text()
}

const encodeSyncValue = async (value: unknown): Promise<[number, unknown]> => {
  const compact = compactSyncValue(value)
  const compactValue: [number, unknown] = [SYNC_VALUE_FORMAT, compact]

  if (
    typeof CompressionStream === "undefined" ||
    typeof DecompressionStream === "undefined" ||
    typeof btoa === "undefined"
  ) {
    return compactValue
  }

  try {
    const compressedValue: [number, string] = [
      COMPRESSED_SYNC_VALUE_FORMAT,
      bytesToBase64(await gzip(JSON.stringify(compact)))
    ]
    return JSON.stringify(compressedValue).length <
      JSON.stringify(compactValue).length
      ? compressedValue
      : compactValue
  } catch {
    return compactValue
  }
}

const decodeSyncValue = async (value: unknown): Promise<unknown> => {
  if (isCompressedSyncValue(value)) {
    return expandSyncValue(JSON.parse(await gunzip(base64ToBytes(value[1]))))
  }

  return isEncodedSyncValue(value) ? expandSyncValue(value[1]) : value
}

export class StorageService {
  private static instance: StorageService
  private syncRecoveryTimer: ReturnType<typeof setTimeout> | null = null
  private syncRecoveryInitialized = false
  private syncOperationQueue: Promise<void> = Promise.resolve()
  private lastSyncOperationAt = 0

  static getInstance() {
    if (!this.instance) this.instance = new StorageService()
    return this.instance
  }

  initializeSyncRecovery() {
    if (
      this.syncRecoveryInitialized ||
      !hasValidExtensionContext() ||
      !chrome.storage?.sync ||
      !chrome.storage?.local ||
      !chrome.storage?.onChanged
    ) return

    this.syncRecoveryInitialized = true
    void this.snapshotManagedSyncData()
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !Object.keys(changes).some(isManagedSyncKey)) return

      if (this.syncRecoveryTimer) clearTimeout(this.syncRecoveryTimer)
      this.syncRecoveryTimer = setTimeout(() => {
        this.syncRecoveryTimer = null
        void this.recoverOrSnapshotManagedSyncData()
      }, SYNC_RECOVERY_DELAY_MS)
    })
  }

  private async snapshotManagedSyncData() {
    if (!hasValidExtensionContext() || !chrome.storage?.sync || !chrome.storage?.local) return

    try {
      const data = getManagedSyncValues(await chrome.storage.sync.get(null))
      if (Object.keys(data).length === 0) return
      const snapshot: SyncRecoverySnapshot = { capturedAt: new Date().toISOString(), data }
      await chrome.storage.local.set({ [SYNC_RECOVERY_SNAPSHOT_KEY]: snapshot })
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) console.warn("Sync recovery snapshot failed", error)
    }
  }

  private async recoverOrSnapshotManagedSyncData() {
    if (!hasValidExtensionContext() || !chrome.storage?.sync || !chrome.storage?.local) return

    try {
      const current = getManagedSyncValues(await chrome.storage.sync.get(null))
      if (Object.keys(current).length > 0) {
        await this.snapshotManagedSyncData()
        return
      }

      const stored = await chrome.storage.local.get(SYNC_RECOVERY_SNAPSHOT_KEY)
      const snapshot = stored[SYNC_RECOVERY_SNAPSHOT_KEY] as SyncRecoverySnapshot | undefined
      if (!snapshot?.data || Object.keys(snapshot.data).length === 0) return

      await chrome.storage.sync.set(snapshot.data)
      console.warn("[Poe Trade Plus] Restored an empty Sync store from the local recovery copy")
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) console.warn("Sync recovery failed", error)
    }
  }

  async setValue(
    key: string,
    value: unknown,
    league: string | null = null,
    area: StorageArea = "local"
  ): Promise<boolean> {
    return this.write(this.formatKey(key, league), {
      expiresAt: null,
      value
    }, area)
  }

  async setEphemeralValue(
    key: string,
    value: unknown,
    expirationDate: Date,
    league: string | null = null
  ): Promise<boolean> {
    return this.write(this.formatKey(key, league), {
      expiresAt: expirationDate.toUTCString(),
      value
    })
  }

  async getValue<T>(
    key: string,
    league: string | null = null,
    area: StorageArea = "local"
  ): Promise<T | null> {
    const payload = await this.read(this.formatKey(key, league), area)
    if (!payload) return null

    const { expiresAt, value } = payload
    if (!expiresAt) return value as T

    if (new Date().getTime() > new Date(expiresAt).getTime()) return null
    return value as T
  }

  async getStaleValue<T>(
    key: string,
    league: string | null = null
  ): Promise<T | null> {
    const payload = await this.read(this.formatKey(key, league))
    return payload ? (payload.value as T) : null
  }

  private formatKey(key: string, league: string | null) {
    return (league ? `${key}--${league}` : key).toLowerCase()
  }

  private getStorageArea(area: StorageArea): chrome.storage.StorageArea | null {
    if (!hasValidExtensionContext() || !chrome.storage?.[area]) {
      console.warn("Storage not available")
      return null
    }
    return chrome.storage[area]
  }

  private async read(
    key: string,
    area: StorageArea = "local"
  ): Promise<StoragePayload | null> {
    const storageArea = this.getStorageArea(area)
    if (!storageArea) return null
    try {
      const result = await storageArea.get([key])
      const payload = result[key]
      if (!isStoragePayload(payload)) return null

      if (area !== "sync") return payload

      const value = await decodeSyncValue(payload.value)
      if (!isCompressedSyncValue(payload.value)) {
        const encodedValue = await encodeSyncValue(value)
        if (JSON.stringify(encodedValue) === JSON.stringify(payload.value)) {
          return { ...payload, value }
        }
        await storageArea.set({
          [key]: {
            ...payload,
            value: encodedValue
          }
        })
      }

      return { ...payload, value }
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.warn("Storage read failed", error)
      }
      return null
    }
  }

  async deleteValue(
    key: string,
    league: string | null = null,
    area: StorageArea = "local"
  ): Promise<boolean> {
    return this.remove(this.formatKey(key, league), area)
  }

  setLocalValue(key: string, value: string, league: string | null = null) {
    window.localStorage.setItem(`bt-${this.formatKey(key, league)}`, value)
  }

  getLocalValue(key: string, league: string | null = null): string | null {
    return window.localStorage.getItem(`bt-${this.formatKey(key, league)}`)
  }

  deleteLocalValue(key: string, league: string | null = null) {
    window.localStorage.removeItem(`bt-${this.formatKey(key, league)}`)
  }

  private async write(
    key: string,
    value: StoragePayload,
    area: StorageArea = "local"
  ): Promise<boolean> {
    const storageArea = this.getStorageArea(area)
    if (!storageArea) return false
    const operation = async () => {
      const storedValue =
        area === "sync" ? await encodeSyncValue(value.value) : value
      await storageArea.set({
        [key]:
          area === "sync" ? { ...value, value: storedValue } : value
      })
      if (area === "sync") void this.snapshotManagedSyncData()
    }
    try {
      if (area === "sync") {
        await this.enqueueSyncOperation(operation)
      } else {
        await operation()
      }
      return true
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.warn("Storage write failed", error)
      }
      return false
    }
  }

  private async remove(
    keys: string | string[],
    area: StorageArea = "local"
  ): Promise<boolean> {
    const storageArea = this.getStorageArea(area)
    if (!storageArea) return false
    const operation = async () => {
      await storageArea.remove(keys)
      if (area === "sync") void this.snapshotManagedSyncData()
    }
    try {
      if (area === "sync") {
        await this.enqueueSyncOperation(operation)
      } else {
        await operation()
      }
      return true
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.warn("Storage remove failed", error)
      }
      return false
    }
  }

  private enqueueSyncOperation(operation: () => Promise<void>): Promise<void> {
    const queued = this.syncOperationQueue.then(async () => {
      const delay = Math.max(0, 550 - (Date.now() - this.lastSyncOperationAt))
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      await operation()
      this.lastSyncOperationAt = Date.now()
    })
    this.syncOperationQueue = queued.catch(() => undefined)
    return queued
  }
}

export const storageService = StorageService.getInstance()
