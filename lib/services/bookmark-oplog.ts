import type {
  BookmarksFolderStruct,
  BookmarksTradeStruct
} from "../types/bookmarks"
import { uniqueId } from "../utilities/unique-id"
import { storageService } from "./storage"

export const BOOKMARK_OPLOG_DEVICE_KEY = "bookmark-oplog-device-id"
export const BOOKMARK_OPLOG_PREFIX = "bookmark-oplog--"
/** Chrome Sync's practical limits for the bookmarks replication protocol. */
export const BOOKMARK_OPLOG_MAX_TOTAL_BYTES = 100 * 1024
export const BOOKMARK_OPLOG_MAX_ITEM_BYTES = 8 * 1024
// Leave room for StorageService's envelope, encoded key and future metadata.
export const BOOKMARK_OPLOG_TARGET_ITEM_BYTES = 7 * 1024

export type HybridClock = {
  wallTime: number
  counter: number
  actor: string
}

export type BookmarkOplogOperation =
  | {
      id: string
      clock: HybridClock
      type: "upsert-folder"
      folder: BookmarksFolderStruct
    }
  | {
      id: string
      clock: HybridClock
      type: "delete-folder"
      folderId: string
    }
  | {
      id: string
      clock: HybridClock
      type: "upsert-trade"
      folderId: string
      trade: BookmarksTradeStruct
    }
  | {
      id: string
      clock: HybridClock
      type: "delete-trade"
      folderId: string
      tradeId: string
    }

export type BookmarkOplogState = {
  folders: BookmarksFolderStruct[]
  tradesByFolder: Map<string, BookmarksTradeStruct[]>
}

export type BookmarkOplogManifest = {
  version: 1
  actor: string
  chunkKeys: string[]
  updatedAt: number
}

export type BookmarkOplogChunks = {
  manifest: BookmarkOplogManifest
  chunks: Record<string, BookmarkOplogOperation[]>
  bytes: number
}

const compareClock = (left: HybridClock, right: HybridClock) =>
  left.wallTime - right.wallTime ||
  left.counter - right.counter ||
  left.actor.localeCompare(right.actor)

const compareOperation = (
  left: BookmarkOplogOperation,
  right: BookmarkOplogOperation
) => compareClock(left.clock, right.clock) || left.id.localeCompare(right.id)

const operationEntityKey = (operation: BookmarkOplogOperation) => {
  if (operation.type === "upsert-folder") return `folder:${operation.folder.id}`
  if (operation.type === "delete-folder") return `folder:${operation.folderId}`
  if (operation.type === "upsert-trade") return `trade:${operation.trade.id}`
  return `trade:${operation.tradeId}`
}

const encodedBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).length

const storageBytes = (key: string, value: unknown) =>
  encodedBytes(key) + encodedBytes({ expiresAt: null, value })

const rawStorageBytes = (values: Record<string, unknown>) =>
  Object.entries(values).reduce(
    (total, [key, value]) => total + encodedBytes(key) + encodedBytes(value),
    0
  )

export const bookmarkOplogManifestKey = (actor: string) =>
  `${BOOKMARK_OPLOG_PREFIX}${actor}--manifest`

export const bookmarkOplogChunkKey = (actor: string, index: number) =>
  `${BOOKMARK_OPLOG_PREFIX}${actor}--chunk-${index}`

const isManifest = (value: unknown): value is BookmarkOplogManifest =>
  typeof value === "object" &&
  value !== null &&
  (value as BookmarkOplogManifest).version === 1 &&
  typeof (value as BookmarkOplogManifest).actor === "string" &&
  Array.isArray((value as BookmarkOplogManifest).chunkKeys)

export const getBookmarkOplogDeviceId = async () => {
  const existing = await storageService.getValue<string>(BOOKMARK_OPLOG_DEVICE_KEY)
  if (existing) return existing
  const actor = uniqueId()
  const saved = await storageService.setValue(BOOKMARK_OPLOG_DEVICE_KEY, actor)
  if (!saved) throw new Error("Could not create a local bookmark sync device id")
  return actor
}

export const readBookmarkOplog = async (): Promise<BookmarkOplogOperation[]> => {
  if (typeof chrome === "undefined" || !chrome.storage?.sync) return []
  const stored = await chrome.storage.sync.get(null)
  const manifestKeys = Object.keys(stored).filter(
    (key) => key.startsWith(BOOKMARK_OPLOG_PREFIX) && key.endsWith("--manifest")
  )
  const manifests = await Promise.all(
    manifestKeys.map(async (key) => storageService.getValue<BookmarkOplogManifest>(key, null, "sync"))
  )
  const operations = await Promise.all(
    manifests.filter(isManifest).map(async (manifest) => {
      const chunks = await Promise.all(
        manifest.chunkKeys.map((key) =>
          storageService.getValue<BookmarkOplogOperation[]>(key, null, "sync")
        )
      )
      // Do not replay a partially uploaded actor stream. Its previous manifest
      // remains valid until the atomic manifest/chunk update is published.
      if (chunks.some((chunk) => !Array.isArray(chunk))) return []
      return chunks.flatMap((chunk) => chunk || [])
    })
  )
  return compactBookmarkOplog(operations.flat())
}

/**
 * Atomically replaces this device's compacted stream. Actors never share a
 * key, so offline devices cannot overwrite one another's operations.
 */
export const publishBookmarkOplog = async (
  actor: string,
  operations: BookmarkOplogOperation[]
) => {
  if (typeof chrome === "undefined" || !chrome.storage?.sync) {
    throw new Error("Sync storage is unavailable")
  }
  const stored = await chrome.storage.sync.get(null)
  const ownPrefix = `${BOOKMARK_OPLOG_PREFIX}${actor}--`
  const otherBytes = rawStorageBytes(
    Object.fromEntries(
      Object.entries(stored).filter(([key]) => !key.startsWith(ownPrefix))
    )
  )
  const next = createBookmarkOplogChunks(actor, operations, otherBytes)
  const saved = await storageService.setValues(
    { ...next.chunks, [bookmarkOplogManifestKey(actor)]: next.manifest },
    "sync"
  )
  if (!saved) throw new Error("Could not publish bookmark operations to Sync")

  const staleKeys = Object.keys(stored).filter(
    (key) => key.startsWith(ownPrefix) &&
      key !== bookmarkOplogManifestKey(actor) &&
      !(key in next.chunks)
  )
  if (staleKeys.length > 0) {
    await Promise.all(staleKeys.map((key) => storageService.deleteValue(key, null, "sync")))
  }
  return next
}

/**
 * Keeps the latest operation for each entity. Tombstones are deliberately
 * retained, otherwise an older operation from another offline device could
 * resurrect a deleted bookmark after compaction.
 */
export const compactBookmarkOplog = (
  operations: BookmarkOplogOperation[]
): BookmarkOplogOperation[] => {
  const latest = new Map<string, BookmarkOplogOperation>()
  for (const operation of operations) {
    const entity = operationEntityKey(operation)
    const previous = latest.get(entity)
    if (!previous || compareOperation(previous, operation) < 0) {
      latest.set(entity, operation)
    }
  }
  return [...latest.values()].sort(compareOperation)
}

/**
 * Splits an actor's compacted operation set into independently valid Sync
 * items. The conservative 7 KB target also works on browsers that do not
 * compress the StorageService envelope.
 */
export const createBookmarkOplogChunks = (
  actor: string,
  operations: BookmarkOplogOperation[],
  existingBytes = 0
): BookmarkOplogChunks => {
  const compacted = compactBookmarkOplog(operations)
  const chunks: BookmarkOplogOperation[][] = []
  let current: BookmarkOplogOperation[] = []

  for (const operation of compacted) {
    const chunkKey = bookmarkOplogChunkKey(actor, chunks.length)
    const candidate = [...current, operation]
    if (
      current.length > 0 &&
      storageBytes(chunkKey, candidate) > BOOKMARK_OPLOG_TARGET_ITEM_BYTES
    ) {
      chunks.push(current)
      current = [operation]
    } else {
      current = candidate
    }

    if (storageBytes(bookmarkOplogChunkKey(actor, chunks.length), current) > BOOKMARK_OPLOG_MAX_ITEM_BYTES) {
      throw new Error("A bookmark operation is too large to synchronize")
    }
  }
  if (current.length > 0) chunks.push(current)

  const manifest: BookmarkOplogManifest = {
    version: 1,
    actor,
    chunkKeys: chunks.map((_, index) => bookmarkOplogChunkKey(actor, index)),
    updatedAt: Date.now()
  }
  const storedChunks = Object.fromEntries(
    chunks.map((chunk, index) => [bookmarkOplogChunkKey(actor, index), chunk])
  )
  const bytes =
    storageBytes(bookmarkOplogManifestKey(actor), manifest) +
    Object.entries(storedChunks).reduce(
      (total, [key, chunk]) => total + storageBytes(key, chunk),
      0
    )
  if (existingBytes + bytes > BOOKMARK_OPLOG_MAX_TOTAL_BYTES) {
    throw new Error("Bookmarks exceed the 100 KB Sync quota")
  }
  return { manifest, chunks: storedChunks, bytes }
}

const cloneFolder = (folder: BookmarksFolderStruct): BookmarksFolderStruct => ({
  ...folder,
  categories: (folder.categories || []).map((category) => ({ ...category }))
})

const cloneTrade = (trade: BookmarksTradeStruct): BookmarksTradeStruct => ({
  ...trade,
  location: { ...trade.location }
})

export class BookmarkOplog {
  private actor = ""
  private counter = 0
  private observedWallTime = 0

  constructor(actor: string) {
    this.actor = actor
  }

  nextClock(): HybridClock {
    const now = Date.now()
    if (now > this.observedWallTime) {
      this.observedWallTime = now
      this.counter = 0
    } else {
      this.counter += 1
    }
    return {
      wallTime: this.observedWallTime,
      counter: this.counter,
      actor: this.actor
    }
  }

  observe(clock: HybridClock) {
    this.observedWallTime = Math.max(this.observedWallTime, clock.wallTime)
    if (clock.wallTime === this.observedWallTime) {
      this.counter = Math.max(this.counter, clock.counter)
    }
  }

  upsertFolder(folder: BookmarksFolderStruct): BookmarkOplogOperation {
    return { id: uniqueId(), clock: this.nextClock(), type: "upsert-folder", folder: cloneFolder(folder) }
  }

  deleteFolder(folderId: string): BookmarkOplogOperation {
    return { id: uniqueId(), clock: this.nextClock(), type: "delete-folder", folderId }
  }

  upsertTrade(folderId: string, trade: BookmarksTradeStruct): BookmarkOplogOperation {
    return { id: uniqueId(), clock: this.nextClock(), type: "upsert-trade", folderId, trade: cloneTrade(trade) }
  }

  deleteTrade(folderId: string, tradeId: string): BookmarkOplogOperation {
    return { id: uniqueId(), clock: this.nextClock(), type: "delete-trade", folderId, tradeId }
  }
}

/**
 * Merges operations as an observed-remove set. Independent entities always
 * survive concurrent offline edits; only the same entity uses clock ordering.
 */
export const replayBookmarkOplog = (
  operations: BookmarkOplogOperation[]
): BookmarkOplogState => {
  const folders = new Map<string, { value?: BookmarksFolderStruct; clock: HybridClock }>()
  const trades = new Map<string, { folderId: string; value?: BookmarksTradeStruct; clock: HybridClock }>()

  for (const operation of [...operations].sort(compareOperation)) {
    if (operation.type === "upsert-folder" || operation.type === "delete-folder") {
      const folderId = operation.type === "upsert-folder" ? operation.folder.id : operation.folderId
      if (!folderId) continue
      const current = folders.get(folderId)
      if (current && compareClock(current.clock, operation.clock) >= 0) continue
      folders.set(folderId, {
        clock: operation.clock,
        value: operation.type === "upsert-folder" ? cloneFolder(operation.folder) : undefined
      })
      continue
    }

    const tradeId = operation.type === "upsert-trade" ? operation.trade.id : operation.tradeId
    if (!tradeId) continue
    const current = trades.get(tradeId)
    if (current && compareClock(current.clock, operation.clock) >= 0) continue
    trades.set(tradeId, {
      clock: operation.clock,
      folderId: operation.folderId,
      value: operation.type === "upsert-trade" ? cloneTrade(operation.trade) : undefined
    })
  }

  const tradesByFolder = new Map<string, BookmarksTradeStruct[]>()
  for (const trade of trades.values()) {
    // Keep orphaned legacy trades readable while the legacy snapshot is being
    // migrated. Folder deletion emits explicit trade tombstones, so a deleted
    // folder cannot later resurrect its old entries.
    if (!trade.value) continue
    const entries = tradesByFolder.get(trade.folderId) || []
    entries.push(trade.value)
    tradesByFolder.set(trade.folderId, entries)
  }
  return {
    folders: [...folders.values()].flatMap((entry) => entry.value ? [entry.value] : []),
    tradesByFolder
  }
}
