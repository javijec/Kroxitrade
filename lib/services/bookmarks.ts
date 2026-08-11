import { get, writable } from "svelte/store"

import type {
  BookmarksCategoryStruct,
  BookmarksFolderIcon,
  BookmarksFolderStruct,
  BookmarksTradeStruct,
  PartialBookmarksTradeLocation
} from "../types/bookmarks"
import type { TradeSiteVersion } from "../types/trade-location"
import { decodeBase64Utf8, encodeBase64Utf8 } from "../utilities/base64"
import { uniqueId } from "../utilities/unique-id"
import { languageStore, translate } from "./i18n"
import { storageService, type StorageArea } from "./storage"

const FOLDERS_KEY = "bookmark-folders"
const FOLDERS_MANIFEST_KEY = "bookmark-folders-manifest"
const FOLDERS_CHUNK_PREFIX = "bookmark-folders-chunk--"
const TRADES_PREFIX_KEY = "bookmark-trades"
const TRADES_MANIFEST_PREFIX = "bookmark-trades-manifest--"
const TRADES_CHUNK_PREFIX = "bookmark-trades-chunk--"
const BOOKMARKS_STORAGE_AREA: StorageArea = "sync"
const FOLDERS_CHUNK_TARGET_BYTES = 6 * 1024
const SECTION_DELIMITER = "\n--------------------\n"
const LINE_DELIMITER = "\n"

const getStorageChangeValue = <T>(
  change: chrome.storage.StorageChange | undefined
): T | undefined => {
  const payload = change?.newValue

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("value" in payload)
  ) {
    return undefined
  }

  return payload.value as T
}

type ExportVersion = 1 | 2 | 3 | 4 | 5
type BookmarksChangeEvent = {
  foldersChanged?: boolean
  tradesChanged?: boolean
  folderId?: string
}

interface ExportedFolderStruct {
  icn: string
  tit: string
  ver?: TradeSiteVersion
  cats?: Array<{ id: string; tit: string }>
  trs: Array<{ tit: string; loc: string; cat?: string }>
}

interface FoldersManifest {
  version: 1
  chunkKeys: string[]
}

export class BookmarksService {
  private foldersStore = writable<BookmarksFolderStruct[]>([])
  private listeners = new Set<(event?: BookmarksChangeEvent) => void>()
  private tradesCache = new Map<string, BookmarksTradeStruct[]>()
  private tradesRequests = new Map<string, Promise<BookmarksTradeStruct[]>>()
  private tradesWriteQueues = new Map<string, Promise<unknown>>()
  private deletedTradeFolderIds = new Set<string>()
  private tradesMutationTail: Promise<void> = Promise.resolve()
  private foldersWriteDepth = 0
  private pendingCategoryTransfers = 0
  private pendingCategoryTransferFolders = new Map<string, number>()
  private completedCategoryTransferFolders = new Set<string>()
  private foldersMigration: Promise<void> | null = null
  private tradesMigrations = new Map<string, Promise<void>>()
  public subscribe = this.foldersStore.subscribe

  constructor() {
    this.refresh()
    this.bindStorageSync()
  }

  async refresh(options?: { force?: boolean }) {
    if (!options?.force && this.pendingCategoryTransfers > 0) return
    const folders = await this.fetchFolders()
    this.foldersStore.set(folders)
    this.notifyChange()
  }

  onChange(callback: (event?: BookmarksChangeEvent) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyChange(event?: BookmarksChangeEvent) {
    this.listeners.forEach((listener) => listener(event))
  }

  private bindStorageSync() {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== BOOKMARKS_STORAGE_AREA) return

      const foldersChanged = Object.keys(changes).some(
        (key) =>
          key === FOLDERS_KEY ||
          key === FOLDERS_MANIFEST_KEY ||
          key.startsWith(FOLDERS_CHUNK_PREFIX)
      )
      if (foldersChanged && this.foldersWriteDepth === 0) {
        void this.refresh()
      }

      const changedTradeFolderIds = new Set<string>()
      for (const key of Object.keys(changes)) {
        const folderId = this.getTradeFolderIdFromStorageKey(key)
        if (folderId) changedTradeFolderIds.add(folderId)
      }
      for (const folderId of changedTradeFolderIds) {
        if (this.hasLocalTradesEdits(folderId) || this.isCategoryTransferPending(folderId)) continue
        this.tradesCache.delete(folderId)
        this.tradesRequests.delete(folderId)
        void this.refreshTradesFromStorage(folderId)
      }
    })
  }

  // ─── STORAGE ──────────────────────────────────────────────

  async fetchFolders(): Promise<BookmarksFolderStruct[]> {
    const chunkedFolders = await this.fetchChunkedFolders()
    if (chunkedFolders !== null) return this.normalizeFolders(chunkedFolders)

    const legacyFolders =
      await this.fetchSynced<Partial<BookmarksFolderStruct>[]>(FOLDERS_KEY)
    if (legacyFolders && legacyFolders.length > 0) {
      await this.migrateFoldersToChunks(legacyFolders)
    }

    return this.normalizeFolders(legacyFolders)
  }

  private async fetchChunkedFolders(): Promise<
    Partial<BookmarksFolderStruct>[] | null
  > {
    const manifest = await storageService.getValue<FoldersManifest>(
      FOLDERS_MANIFEST_KEY,
      null,
      BOOKMARKS_STORAGE_AREA
    )
    if (
      !manifest ||
      manifest.version !== 1 ||
      !Array.isArray(manifest.chunkKeys)
    ) {
      return null
    }

    const chunks = await Promise.all(
      manifest.chunkKeys.map((key) =>
        storageService.getValue<Partial<BookmarksFolderStruct>[]>(
          key,
          null,
          BOOKMARKS_STORAGE_AREA
        )
      )
    )
    if (chunks.some((chunk) => chunk === null)) return null

    return chunks.flatMap((chunk) => chunk || [])
  }

  private chunkFolders(
    folders: BookmarksFolderStruct[],
    generation = ""
  ): Partial<BookmarksFolderStruct>[][] {
    const chunks: Partial<BookmarksFolderStruct>[][] = []
    let current: Partial<BookmarksFolderStruct>[] = []

    for (const folder of folders) {
      const candidate = [...current, folder]
      const key = this.foldersChunkKey(chunks.length, generation)
      if (
        current.length > 0 &&
        this.storagePayloadBytes(key, candidate) > FOLDERS_CHUNK_TARGET_BYTES
      ) {
        chunks.push(current)
        current = [folder]
      } else {
        current = candidate
      }

      if (
        this.storagePayloadBytes(
          this.foldersChunkKey(chunks.length, generation),
          current
        ) > 8192
      ) {
        throw new Error("A bookmark folder is too large to synchronize")
      }
    }

    if (current.length > 0) chunks.push(current)
    return chunks
  }

  private foldersChunkKey(index: number, generation = "") {
    return generation
      ? `${FOLDERS_CHUNK_PREFIX}${generation}-${index}`
      : `${FOLDERS_CHUNK_PREFIX}${index}`
  }

  private storagePayloadBytes(key: string, value: unknown): number {
    return new TextEncoder().encode(
      key + JSON.stringify({ expiresAt: null, value })
    ).length
  }

  private async migrateFoldersToChunks(
    folders: Partial<BookmarksFolderStruct>[]
  ): Promise<void> {
    if (!this.foldersMigration) {
      this.foldersMigration = this.persistFoldersToChunks(
        this.normalizeFolders(folders)
      ).finally(() => {
        this.foldersMigration = null
      })
    }

    return this.foldersMigration
  }

  private async persistFoldersToChunks(
    folders: BookmarksFolderStruct[]
  ): Promise<void> {
    const generation = uniqueId()
    const chunks = this.chunkFolders(folders, generation)
    const manifest: FoldersManifest = {
      version: 1,
      chunkKeys: chunks.map((_, index) =>
        this.foldersChunkKey(index, generation)
      )
    }
    const previous = await storageService.getValue<FoldersManifest>(
      FOLDERS_MANIFEST_KEY,
      null,
      BOOKMARKS_STORAGE_AREA
    )

    const savedChunks = await Promise.all(
      chunks.map((chunk, index) =>
        storageService.setValue(
          this.foldersChunkKey(index, generation),
          chunk,
          null,
          BOOKMARKS_STORAGE_AREA
        )
      )
    )
    if (savedChunks.some((saved) => !saved)) {
      throw new Error("Could not save bookmark folder chunks to sync storage")
    }

    await this.persistSynced(FOLDERS_MANIFEST_KEY, manifest)

    const staleChunkKeys = (previous?.chunkKeys || []).filter(
      (key) => !manifest.chunkKeys.includes(key)
    )
    await Promise.all(
      staleChunkKeys.map((key) =>
        storageService.deleteValue(key, null, BOOKMARKS_STORAGE_AREA)
      )
    )

    await Promise.all([
      storageService.deleteValue(FOLDERS_KEY),
      storageService.deleteValue(FOLDERS_KEY, null, BOOKMARKS_STORAGE_AREA)
    ])
  }

  private tradesManifestKey(folderId: string) {
    return `${TRADES_MANIFEST_PREFIX}${folderId}`
  }

  private tradesChunkKey(folderId: string, index: number, generation = "") {
    return generation
      ? `${TRADES_CHUNK_PREFIX}${folderId}--${generation}-${index}`
      : `${TRADES_CHUNK_PREFIX}${folderId}--${index}`
  }

  private getTradeFolderIdFromStorageKey(key: string): string | null {
    const tradesPrefix = `${TRADES_PREFIX_KEY}--`
    if (key.startsWith(tradesPrefix)) return key.slice(tradesPrefix.length)
    if (key.startsWith(TRADES_MANIFEST_PREFIX)) {
      return key.slice(TRADES_MANIFEST_PREFIX.length)
    }
    if (key.startsWith(TRADES_CHUNK_PREFIX)) {
      const suffix = key.slice(TRADES_CHUNK_PREFIX.length)
      return suffix.slice(0, suffix.lastIndexOf("--")) || null
    }
    return null
  }

  private async fetchTrades(folderId: string): Promise<BookmarksTradeStruct[]> {
    const chunkedTrades = await this.fetchChunkedTrades(folderId)
    if (chunkedTrades !== null) return chunkedTrades

    const legacyTrades = await this.fetchSynced<BookmarksTradeStruct[]>(
      `${TRADES_PREFIX_KEY}--${folderId}`
    )
    if (legacyTrades && legacyTrades.length > 0) {
      await this.migrateTradesToChunks(folderId, legacyTrades)
    }

    return legacyTrades || []
  }

  private async fetchChunkedTrades(
    folderId: string
  ): Promise<BookmarksTradeStruct[] | null> {
    const manifest = await storageService.getValue<FoldersManifest>(
      this.tradesManifestKey(folderId),
      null,
      BOOKMARKS_STORAGE_AREA
    )
    if (
      !manifest ||
      manifest.version !== 1 ||
      !Array.isArray(manifest.chunkKeys)
    ) {
      return null
    }

    const chunks = await Promise.all(
      manifest.chunkKeys.map((key) =>
        storageService.getValue<BookmarksTradeStruct[]>(
          key,
          null,
          BOOKMARKS_STORAGE_AREA
        )
      )
    )
    if (chunks.some((chunk) => chunk === null)) return null

    return chunks.flatMap((chunk) => chunk || [])
  }

  private chunkTrades(
    folderId: string,
    trades: BookmarksTradeStruct[],
    generation = ""
  ): BookmarksTradeStruct[][] {
    const chunks: BookmarksTradeStruct[][] = []
    let current: BookmarksTradeStruct[] = []

    for (const trade of trades) {
      const candidate = [...current, trade]
      const key = this.tradesChunkKey(folderId, chunks.length, generation)
      if (
        current.length > 0 &&
        this.storagePayloadBytes(key, candidate) > FOLDERS_CHUNK_TARGET_BYTES
      ) {
        chunks.push(current)
        current = [trade]
      } else {
        current = candidate
      }

      if (
        this.storagePayloadBytes(
          this.tradesChunkKey(folderId, chunks.length, generation),
          current
        ) > 8192
      ) {
        throw new Error("A bookmarked trade is too large to synchronize")
      }
    }

    if (current.length > 0) chunks.push(current)
    return chunks
  }

  private async migrateTradesToChunks(
    folderId: string,
    trades: BookmarksTradeStruct[]
  ): Promise<void> {
    const migration = this.tradesMigrations.get(folderId)
    if (migration) return migration

    const nextMigration = this.persistTradesToChunks(folderId, trades).finally(
      () => this.tradesMigrations.delete(folderId)
    )
    this.tradesMigrations.set(folderId, nextMigration)
    return nextMigration
  }

  private async persistTradesToChunks(
    folderId: string,
    trades: BookmarksTradeStruct[]
  ): Promise<void> {
    const generation = uniqueId()
    const chunks = this.chunkTrades(folderId, trades, generation)
    const manifest: FoldersManifest = {
      version: 1,
      chunkKeys: chunks.map((_, index) =>
        this.tradesChunkKey(folderId, index, generation)
      )
    }
    const manifestKey = this.tradesManifestKey(folderId)
    const previous = await storageService.getValue<FoldersManifest>(
      manifestKey,
      null,
      BOOKMARKS_STORAGE_AREA
    )
    const savedChunks = await Promise.all(
      chunks.map((chunk, index) =>
        storageService.setValue(
          this.tradesChunkKey(folderId, index, generation),
          chunk,
          null,
          BOOKMARKS_STORAGE_AREA
        )
      )
    )
    if (savedChunks.some((saved) => !saved)) {
      throw new Error("Could not save bookmarked trade chunks to sync storage")
    }

    await this.persistSynced(manifestKey, manifest)

    const staleChunkKeys = (previous?.chunkKeys || []).filter(
      (key) => !manifest.chunkKeys.includes(key)
    )
    await Promise.all(
      staleChunkKeys.map((key) =>
        storageService.deleteValue(key, null, BOOKMARKS_STORAGE_AREA)
      )
    )

    await this.deleteSynced(`${TRADES_PREFIX_KEY}--${folderId}`)
  }

  private async persistTradeToAffectedChunk(
    folderId: string,
    trade: BookmarksTradeStruct
  ): Promise<boolean> {
    const manifest = await storageService.getValue<FoldersManifest>(
      this.tradesManifestKey(folderId),
      null,
      BOOKMARKS_STORAGE_AREA
    )
    if (
      !manifest ||
      manifest.version !== 1 ||
      manifest.chunkKeys.length === 0
    ) {
      return false
    }

    const chunks = await Promise.all(
      manifest.chunkKeys.map((key) =>
        storageService.getValue<BookmarksTradeStruct[]>(
          key,
          null,
          BOOKMARKS_STORAGE_AREA
        )
      )
    )
    if (chunks.some((chunk) => chunk === null)) return false

    let chunkIndex = chunks.findIndex((chunk) =>
      chunk?.some((entry) => entry.id === trade.id)
    )
    if (chunkIndex < 0) chunkIndex = chunks.length - 1

    const current = chunks[chunkIndex] || []
    const existingIndex = current.findIndex((entry) => entry.id === trade.id)
    const next =
      existingIndex < 0
        ? [...current, trade]
        : current.map((entry, index) =>
            index === existingIndex ? trade : entry
          )
    const key = manifest.chunkKeys[chunkIndex]

    if (this.storagePayloadBytes(key, next) <= FOLDERS_CHUNK_TARGET_BYTES) {
      return storageService.setValue(key, next, null, BOOKMARKS_STORAGE_AREA)
    }

    if (existingIndex >= 0) return false

    const nextKey = this.tradesChunkKey(
      folderId,
      manifest.chunkKeys.length,
      uniqueId()
    )
    const saved = await storageService.setValue(
      nextKey,
      [trade],
      null,
      BOOKMARKS_STORAGE_AREA
    )
    if (!saved) return false

    await this.persistSynced(this.tradesManifestKey(folderId), {
      version: 1,
      chunkKeys: [...manifest.chunkKeys, nextKey]
    })
    return true
  }

  private enqueueTradesWrite<T>(folderId: string, write: () => Promise<T>) {
    const previous = this.tradesWriteQueues.get(folderId) ?? Promise.resolve()
    const queued = previous.catch(() => undefined).then(write)
    this.tradesWriteQueues.set(folderId, queued)
    void queued
      .finally(() => {
        if (this.tradesWriteQueues.get(folderId) === queued) {
          this.tradesWriteQueues.delete(folderId)
        }
      })
      .catch(() => undefined)
    return queued
  }

  private hasLocalTradesEdits(folderId: string) {
    return this.tradesWriteQueues.has(folderId)
  }

  private isCategoryTransferPending(folderId: string) {
    return (this.pendingCategoryTransferFolders.get(folderId) || 0) > 0
  }

  private setCategoryTransferPending(folderId: string, pending: boolean) {
    const count = this.pendingCategoryTransferFolders.get(folderId) || 0
    if (pending) {
      this.pendingCategoryTransferFolders.set(folderId, count + 1)
    } else if (count <= 1) {
      this.pendingCategoryTransferFolders.delete(folderId)
    } else {
      this.pendingCategoryTransferFolders.set(folderId, count - 1)
    }
  }

  private cloneTrades(trades: BookmarksTradeStruct[]): BookmarksTradeStruct[] {
    return trades.map((trade) => ({
      ...trade,
      location: { ...trade.location }
    }))
  }

  private assertFolderCanPersist(folderId: string) {
    if (!folderId || this.deletedTradeFolderIds.has(folderId)) {
      throw new Error("Cannot save trades for a deleted bookmark folder")
    }
  }

  private enqueueTradesMutation<T>(run: () => T | Promise<T>): Promise<T> {
    const result = this.tradesMutationTail.then(run, run)
    this.tradesMutationTail = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  private async deleteChunkedTrades(folderId: string): Promise<void> {
    const manifestKey = this.tradesManifestKey(folderId)
    const manifest = await storageService.getValue<FoldersManifest>(
      manifestKey,
      null,
      BOOKMARKS_STORAGE_AREA
    )
    await Promise.all([
      ...(manifest?.chunkKeys || []).map((key) =>
        storageService.deleteValue(key, null, BOOKMARKS_STORAGE_AREA)
      ),
      storageService.deleteValue(manifestKey, null, BOOKMARKS_STORAGE_AREA),
      storageService.deleteValue(manifestKey),
      this.deleteSynced(`${TRADES_PREFIX_KEY}--${folderId}`)
    ])
  }

  private normalizeFolders(
    folders: Partial<BookmarksFolderStruct>[] | null | undefined
  ): BookmarksFolderStruct[] {
    return (folders || []).map((f) =>
      this.initializeFolderStruct(f.version || "1", f)
    )
  }

  private normalizeCategories(
    categories: BookmarksFolderStruct["categories"] | null | undefined
  ): BookmarksCategoryStruct[] {
    return (categories || [])
      .filter(
        (category) =>
          typeof category.id === "string" && typeof category.title === "string"
      )
      .map((category) => ({
        id: category.id,
        title: category.title
      }))
  }

  private normalizeTrades(
    trades: BookmarksTradeStruct[] | null | undefined
  ): BookmarksTradeStruct[] {
    return (trades || []).map((t) => ({
      ...t,
      archivedAt: typeof t.archivedAt === "string" ? t.archivedAt : null,
      categoryId:
        typeof t.categoryId === "string" && t.categoryId ? t.categoryId : null,
      location: {
        ...t.location,
        version: t.location.version || "1",
        league: t.location.league || null
      }
    }))
  }

  getCachedTradesByFolderId(folderId: string): BookmarksTradeStruct[] | null {
    const cached = this.tradesCache.get(folderId)
    return cached ? [...cached] : null
  }

  async fetchTradesByFolderId(
    folderId: string,
    options?: { force?: boolean }
  ): Promise<BookmarksTradeStruct[]> {
    if (!options?.force) {
      const cached = this.getCachedTradesByFolderId(folderId)
      if (cached) {
        return cached
      }

      const pending = this.tradesRequests.get(folderId)
      if (pending) {
        return pending
      }
    }

    const request = this.fetchTrades(folderId)
      .then((trades) => {
        const normalized = this.normalizeTrades(trades)
        if (this.hasLocalTradesEdits(folderId) && this.tradesCache.has(folderId)) {
          return this.cloneTrades(this.tradesCache.get(folderId) || [])
        }
        this.tradesCache.set(folderId, normalized)
        return this.cloneTrades(normalized)
      })
      .finally(() => {
        this.tradesRequests.delete(folderId)
      })

    this.tradesRequests.set(folderId, request)
    return request
  }

  private async refreshTradesFromStorage(folderId: string) {
    if (this.hasLocalTradesEdits(folderId)) return

    const trades = await this.fetchTradesByFolderId(folderId, { force: true })
    if (this.hasLocalTradesEdits(folderId)) return

    this.tradesCache.set(folderId, trades)
    this.notifyChange({ tradesChanged: true, folderId })
  }

  private async fetchSynced<T>(key: string): Promise<T | null> {
    const local = await storageService.getValue<T>(key)
    const synced = await storageService.getValue<T>(
      key,
      null,
      BOOKMARKS_STORAGE_AREA
    )

    if (this.hasStoredEntries(local) && !this.hasStoredEntries(synced)) {
      const migrated = await storageService.setValue(
        key,
        local,
        null,
        BOOKMARKS_STORAGE_AREA
      )
      if (migrated) {
        await storageService.deleteValue(key)
      }
      return local
    }

    if (synced !== null) return synced

    return local
  }

  private hasStoredEntries(value: unknown): boolean {
    return Array.isArray(value) ? value.length > 0 : value !== null
  }

  private async persistSynced(key: string, value: unknown): Promise<void> {
    const persisted = await storageService.setValue(
      key,
      value,
      null,
      BOOKMARKS_STORAGE_AREA
    )
    if (!persisted) {
      throw new Error("Could not save bookmarks to browser sync storage")
    }

    await storageService.deleteValue(key)
  }

  private async deleteSynced(key: string): Promise<void> {
    const deleted = await storageService.deleteValue(
      key,
      null,
      BOOKMARKS_STORAGE_AREA
    )
    if (!deleted) {
      throw new Error("Could not delete bookmarks from browser sync storage")
    }

    await storageService.deleteValue(key)
  }

  async fetchTradeByLocation(
    location: PartialBookmarksTradeLocation
  ): Promise<BookmarksTradeStruct | null> {
    const folders = await this.fetchFolders()

    const unarchivedFolders = folders.filter((f) => !f.archivedAt)
    const archivedFolders = folders.filter((f) => f.archivedAt)

    const matchLocation = (t: BookmarksTradeStruct) =>
      t.location.version === location.version &&
      t.location.slug === location.slug &&
      t.location.type === location.type &&
      (t.location.league === null || t.location.league === location.league)

    const unarchivedResults = await Promise.all(
      unarchivedFolders.map((f) => this.fetchTradesByFolderId(f.id!))
    )
    for (const trades of unarchivedResults) {
      const match = trades.find(matchLocation)
      if (match) return match
    }

    const archivedResults = await Promise.all(
      archivedFolders.map((f) => this.fetchTradesByFolderId(f.id!))
    )
    for (const trades of archivedResults) {
      const match = trades.find(matchLocation)
      if (match) return match
    }

    return null
  }

  async persistFolder(
    folder: BookmarksFolderStruct,
    options?: { moveToEnd?: boolean }
  ): Promise<string> {
    const folders = await this.fetchFolders()
    let updated: BookmarksFolderStruct[]
    const id = folder.id || uniqueId()

    if (!folder.id) {
      updated = [...folders, { ...folder, id }]
    } else {
      updated = folders.map((f) =>
        f.id === folder.id ? { ...f, ...folder } : f
      )
      if (options?.moveToEnd) {
        updated = [
          ...updated.filter((f) => f.id !== id),
          ...updated.filter((f) => f.id === id)
        ]
      }
    }
    await this.persistFolders(updated)
    await this.refresh()
    return id
  }

  async persistFolders(folders: BookmarksFolderStruct[]) {
    this.foldersWriteDepth++
    try {
      await this.persistFoldersToChunks(folders)
    } finally {
      this.foldersWriteDepth--
    }
  }

  async persistTrade(
    trade: BookmarksTradeStruct,
    folderId: string
  ): Promise<string> {
    return this.enqueueTradesWrite(folderId, async () => {
      const trades = await this.fetchTradesByFolderId(folderId, { force: true })
      const id = trade.id || uniqueId()
      const nextTrade = { ...trade, id }
      const updated = trade.id
        ? trades.map((entry) =>
            entry.id === trade.id ? { ...entry, ...nextTrade } : entry
          )
        : [...trades, nextTrade]

      const savedIncrementally = await this.persistTradeToAffectedChunk(
        folderId,
        this.normalizeTrades([nextTrade])[0]
      )
      if (!savedIncrementally) {
        await this.persistTradesToChunks(
          folderId,
          this.normalizeTrades(updated)
        )
      }
      this.tradesCache.set(folderId, this.normalizeTrades(updated))
      await this.refresh()
      return id
    })
  }

  async persistTrades(
    trades: BookmarksTradeStruct[],
    folderId: string
  ): Promise<BookmarksTradeStruct[]> {
    this.assertFolderCanPersist(folderId)
    const safeTrades = this.normalizeTrades(
      trades.map((trade) => ({ ...trade, id: trade.id || uniqueId() }))
    )

    return this.enqueueTradesWrite(folderId, async () => {
      this.assertFolderCanPersist(folderId)
      await this.persistTradesToChunks(folderId, safeTrades)
      this.tradesCache.set(folderId, this.cloneTrades(safeTrades))
      if (!this.isCategoryTransferPending(folderId)) {
        this.notifyChange({ tradesChanged: true, folderId })
      }
      return this.cloneTrades(safeTrades)
    })
  }

  async deleteTrade(
    tradeId: string,
    folderId: string
  ): Promise<BookmarksTradeStruct[]> {
    const trades = await this.fetchTradesByFolderId(folderId, { force: true })
    const updated = trades.filter((t) => t.id !== tradeId)
    const persisted = await this.persistTrades(updated, folderId)
    await this.refresh()
    return persisted
  }

  async deleteFolder(folderId: string) {
    if (!folderId) throw new Error("A bookmark folder id is required")

    let folders = get(this.foldersStore)
    if (!folders.some((folder) => folder.id === folderId)) {
      folders = await this.fetchFolders()
    }
    if (!folders.some((folder) => folder.id === folderId)) return false

    const updated = folders.filter((folder) => folder.id !== folderId)
    const cachedTrades = this.tradesCache.get(folderId)
    const tradesSnapshot = cachedTrades
      ? this.cloneTrades(cachedTrades)
      : undefined

    // Remove the folder at once. Persistence stays serialized with every
    // bookmark mutation, and a failure restores this exact visible snapshot.
    this.deletedTradeFolderIds.add(folderId)
    this.foldersStore.set(updated)
    this.notifyChange({ foldersChanged: true, folderId })
    this.tradesCache.delete(folderId)
    this.tradesRequests.delete(folderId)

    return this.enqueueTradesMutation(async () => {
      const trades =
        tradesSnapshot ??
        (await this.fetchTradesByFolderId(folderId, { force: true }))

      try {
        await this.persistFolders(updated)
        await this.enqueueTradesWrite(folderId, async () => {
          await this.deleteChunkedTrades(folderId)
          this.tradesCache.delete(folderId)
          this.tradesRequests.delete(folderId)
        })
        await this.refresh()
        return true
      } catch (error) {
        console.warn("Could not delete bookmark folder; restoring it", error)

        this.deletedTradeFolderIds.delete(folderId)
        try {
          await this.persistFolders(folders)
          await this.persistTrades(trades, folderId)
          this.tradesCache.set(folderId, this.cloneTrades(trades))
        } catch (rollbackError) {
          console.warn(
            "Could not restore bookmark folder after a failed deletion",
            rollbackError
          )
        }

        this.foldersStore.set(folders)
        this.notifyChange({ foldersChanged: true, folderId })
        return false
      }
    })
  }

  async duplicateTrade(
    trade: BookmarksTradeStruct,
    targetFolderId: string
  ): Promise<BookmarksTradeStruct[]> {
    const newTrade = { ...trade, id: uniqueId() }
    const trades = await this.fetchTradesByFolderId(targetFolderId, {
      force: true
    })
    const originalIndex = trades.findIndex((item) => item.id === trade.id)
    const updatedTrades = [...trades]
    updatedTrades.splice(
      originalIndex === -1 ? updatedTrades.length : originalIndex + 1,
      0,
      newTrade
    )
    const persisted = await this.persistTrades(updatedTrades, targetFolderId)
    await this.refresh()
    return persisted
  }

  async renameFolder(folder: BookmarksFolderStruct, title: string) {
    return this.persistFolder({ ...folder, title })
  }

  async duplicateFolder(folder: BookmarksFolderStruct) {
    if (!folder.id) throw new Error("Cannot duplicate a folder without an id")
    const language = get(languageStore)
    const newFolder = {
      ...folder,
      id: undefined,
      title: translate(language, "bookmarks.folderCopyTitle", {
        title: folder.title
      })
    }
    const newFolderId = await this.persistFolder(newFolder)
    const trades = await this.fetchTradesByFolderId(folder.id)
    const duplicatedTrades = trades.map((trade) => {
      const { id, ...tradeWithoutId } = trade
      return { ...tradeWithoutId, id: undefined }
    })
    await this.persistTrades(duplicatedTrades, newFolderId)
    await this.refresh()
  }

  async renameTrade(
    trade: BookmarksTradeStruct,
    folderId: string,
    title: string
  ): Promise<BookmarksTradeStruct[]> {
    const trades = await this.fetchTradesByFolderId(folderId, { force: true })
    const updated = trades.map((t) => (t.id === trade.id ? { ...t, title } : t))
    const persisted = await this.persistTrades(updated, folderId)
    await this.refresh()
    return persisted
  }

  async assignTradeCategory(
    trade: BookmarksTradeStruct,
    folderId: string,
    categoryId: string | null
  ): Promise<BookmarksTradeStruct[]> {
    const trades = await this.fetchTradesByFolderId(folderId, { force: true })
    const safeCategoryId = categoryId || null
    const updated = trades.map((t) =>
      t.id === trade.id ? { ...t, categoryId: safeCategoryId } : t
    )
    const persisted = await this.persistTrades(updated, folderId)
    await this.refresh()
    return persisted
  }

  async reorderTrade(
    tradeId: string,
    folderId: string,
    direction: "up" | "down"
  ) {
    const trades = await this.fetchTradesByFolderId(folderId, { force: true })
    const index = trades.findIndex((t) => t.id === tradeId)
    if (index === -1) return

    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= trades.length) return

    const updated = [...trades]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    await this.persistTrades(updated, folderId)
    await this.refresh()
  }

  async moveTrade(
    tradeId: string,
    folderId: string,
    newIndex: number
  ): Promise<BookmarksTradeStruct[]> {
    const trades = await this.fetchTradesByFolderId(folderId, { force: true })
    const index = trades.findIndex((t) => t.id === tradeId)
    if (index === -1) return trades

    const safeIndex = Math.max(0, Math.min(newIndex, trades.length - 1))
    if (index === safeIndex) return trades

    const updated = [...trades]
    const [movedElement] = updated.splice(index, 1)
    updated.splice(safeIndex, 0, movedElement)

    const persisted = await this.persistTrades(updated, folderId)
    await this.refresh()
    return persisted
  }

  async moveCategory(
    folderId: string,
    fromIndex: number,
    toIndex: number
  ): Promise<BookmarksCategoryStruct[]> {
    if (!folderId || !Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) {
      throw new Error("A valid category move is required")
    }

    return this.enqueueTradesMutation(async () => {
      const folders = await this.fetchFolders()
      const folder = folders.find((entry) => entry.id === folderId)
      if (!folder) throw new Error("Bookmark folder no longer exists")

      const categories = this.normalizeCategories(folder.categories)
      if (fromIndex < 0 || fromIndex >= categories.length || toIndex < 0 || toIndex >= categories.length) {
        throw new Error("Category move is outside the folder bounds")
      }
      if (fromIndex === toIndex) return categories

      const reordered = [...categories]
      const [moved] = reordered.splice(fromIndex, 1)
      // `toIndex` is the final visual index, so moving down inserts after the
      // item that was originally the drop target.
      reordered.splice(toIndex, 0, moved)
      const updatedFolder = { ...folder, categories: reordered }
      await this.persistFolders(
        folders.map((entry) => entry.id === folderId ? updatedFolder : entry)
      )
      await this.refresh()
      return reordered
    })
  }

  async moveCategoryBetweenFolders(
    categoryId: string,
    sourceFolderId: string,
    targetFolderId: string
  ): Promise<void> {
    if (!categoryId || !sourceFolderId || !targetFolderId || sourceFolderId === targetFolderId) {
      throw new Error("A category and two different bookmark folders are required")
    }

    this.pendingCategoryTransfers += 1
    this.setCategoryTransferPending(sourceFolderId, true)
    this.setCategoryTransferPending(targetFolderId, true)

    const cachedFolders = get(this.foldersStore)
    const cachedSource = cachedFolders.find((folder) => folder.id === sourceFolderId)
    const cachedTarget = cachedFolders.find((folder) => folder.id === targetFolderId)
    const cachedCategory = this.normalizeCategories(cachedSource?.categories)
      .find((category) => category.id === categoryId)
    if (cachedSource && cachedTarget && cachedCategory) {
      const sourceTrades = this.tradesCache.get(sourceFolderId)
      const targetTrades = this.tradesCache.get(targetFolderId)
      const movedTrades = sourceTrades?.filter((trade) => trade.categoryId === categoryId) || []
      if (sourceTrades) {
        this.tradesCache.set(
          sourceFolderId,
          this.cloneTrades(sourceTrades.filter((trade) => trade.categoryId !== categoryId))
        )
      }
      if (targetTrades) {
        this.tradesCache.set(
          targetFolderId,
          this.cloneTrades([...targetTrades, ...movedTrades])
        )
      }
      this.foldersStore.set(cachedFolders.map((folder) => {
        if (folder.id === sourceFolderId) {
          return {
            ...folder,
            categories: this.normalizeCategories(folder.categories)
              .filter((category) => category.id !== categoryId)
          }
        }
        if (folder.id === targetFolderId) {
          return {
            ...folder,
            categories: [...this.normalizeCategories(folder.categories), cachedCategory]
          }
        }
        return folder
      }))
      this.notifyChange({ foldersChanged: true })
      if (sourceTrades) this.notifyChange({ tradesChanged: true, folderId: sourceFolderId })
      if (targetTrades) this.notifyChange({ tradesChanged: true, folderId: targetFolderId })
    }

    const transfer = this.enqueueTradesMutation(async () => {
      const folders = await this.fetchFolders()
      const source = folders.find((folder) => folder.id === sourceFolderId)
      const target = folders.find((folder) => folder.id === targetFolderId)
      const movedCategory = this.normalizeCategories(source?.categories)
        .find((entry) => entry.id === categoryId)
      if (!source || !target || !movedCategory) {
        throw new Error("Bookmark category no longer exists in the source folder")
      }

      const [sourceSnapshot, targetSnapshot] = await Promise.all([
        this.fetchTrades(sourceFolderId).then((trades) => this.normalizeTrades(trades)),
        this.fetchTrades(targetFolderId).then((trades) => this.normalizeTrades(trades))
      ])
      const movedTrades = sourceSnapshot.filter((trade) => trade.categoryId === categoryId)
      const nextSourceTrades = sourceSnapshot.filter((trade) => trade.categoryId !== categoryId)
      const nextTargetTrades = [...targetSnapshot, ...movedTrades]
      const nextFolders = folders.map((folder) => {
        if (folder.id === sourceFolderId) {
          return {
            ...folder,
            categories: this.normalizeCategories(folder.categories)
              .filter((entry) => entry.id !== categoryId)
          }
        }
        if (folder.id === targetFolderId) {
          return {
            ...folder,
            categories: [...this.normalizeCategories(folder.categories), movedCategory]
          }
        }
        return folder
      })

      try {
        await this.persistFolders(nextFolders)
        await this.persistTrades(nextSourceTrades, sourceFolderId)
        await this.persistTrades(nextTargetTrades, targetFolderId)
        await this.refresh()
      } catch (error) {
        await Promise.allSettled([
          this.persistFolders(folders),
          this.persistTrades(sourceSnapshot, sourceFolderId),
          this.persistTrades(targetSnapshot, targetFolderId)
        ])
        await this.refresh()
        throw error
      }
    })

    return transfer.finally(async () => {
      this.pendingCategoryTransfers -= 1
      this.setCategoryTransferPending(sourceFolderId, false)
      this.setCategoryTransferPending(targetFolderId, false)
      this.completedCategoryTransferFolders.add(sourceFolderId)
      this.completedCategoryTransferFolders.add(targetFolderId)
      if (this.pendingCategoryTransfers === 0) {
        await this.refresh({ force: true })
        const completedFolderIds = [...this.completedCategoryTransferFolders]
        this.completedCategoryTransferFolders.clear()
        for (const folderId of completedFolderIds) {
          this.notifyChange({ tradesChanged: true, folderId })
        }
      }
    })
  }

  async moveTradeBetweenFolders(
    tradeId: string,
    sourceFolderId: string,
    targetFolderId: string,
    targetIndex?: number
  ): Promise<{
    sourceTrades: BookmarksTradeStruct[];
    targetTrades: BookmarksTradeStruct[];
  }> {
    if (!tradeId || !sourceFolderId || !targetFolderId) {
      throw new Error("A trade and both bookmark folders are required")
    }
    if (sourceFolderId === targetFolderId) {
      throw new Error("A trade must be moved to a different bookmark folder")
    }
    if (targetIndex !== undefined && (!Number.isInteger(targetIndex) || targetIndex < 0)) {
      throw new Error("The target trade position is invalid")
    }

    // Move already-loaded lists immediately. Persistence below remains
    // serialized, but expanded folders should not wait for the Sync queue.
    const cachedSource = this.tradesCache.get(sourceFolderId)
    const cachedTarget = this.tradesCache.get(targetFolderId)
    const targetFolder = get(this.foldersStore).find((folder) => folder.id === targetFolderId)
    const cachedSourceIndex = cachedSource?.findIndex((trade) => trade.id === tradeId) ?? -1
    if (cachedSource && cachedSourceIndex >= 0) {
      const sourceTrades = this.cloneTrades(cachedSource)
      const [movedTrade] = sourceTrades.splice(cachedSourceIndex, 1)
      this.tradesCache.set(sourceFolderId, sourceTrades)
      this.notifyChange({ tradesChanged: true, folderId: sourceFolderId })

      if (cachedTarget && targetFolder) {
        const targetTrades = this.cloneTrades(cachedTarget)
        const categoryExistsInTarget = this.normalizeCategories(targetFolder.categories)
          .some((category) => category.id === movedTrade.categoryId)
        const insertionIndex = targetIndex === undefined
          ? targetTrades.length
          : Math.min(targetIndex, targetTrades.length)
        targetTrades.splice(insertionIndex, 0, {
          ...movedTrade,
          location: { ...movedTrade.location },
          categoryId: categoryExistsInTarget ? movedTrade.categoryId || null : null
        })
        this.tradesCache.set(targetFolderId, targetTrades)
        this.notifyChange({ tradesChanged: true, folderId: targetFolderId })
      }
    }

    return this.enqueueTradesMutation(async () => {
      const folders = await this.fetchFolders()
      const sourceFolder = folders.find((folder) => folder.id === sourceFolderId)
      const targetFolder = folders.find((folder) => folder.id === targetFolderId)
      if (!sourceFolder || !targetFolder) {
        throw new Error("The source or target bookmark folder no longer exists")
      }

      const [sourceSnapshot, targetSnapshot] = await Promise.all([
        this.fetchTrades(sourceFolderId).then((trades) => this.normalizeTrades(trades)),
        this.fetchTrades(targetFolderId).then((trades) => this.normalizeTrades(trades))
      ])
      const sourceTrades = this.cloneTrades(sourceSnapshot)
      const targetTrades = this.cloneTrades(targetSnapshot)
      const sourceIndex = sourceTrades.findIndex((trade) => trade.id === tradeId)
      if (sourceIndex < 0) throw new Error("Bookmark trade no longer exists in the source folder")

      const [movedTrade] = sourceTrades.splice(sourceIndex, 1)
      const categoryExistsInTarget = this.normalizeCategories(targetFolder.categories)
        .some((category) => category.id === movedTrade.categoryId)
      const moved = {
        ...movedTrade,
        location: { ...movedTrade.location },
        categoryId: categoryExistsInTarget ? movedTrade.categoryId || null : null
      }
      const insertionIndex = targetIndex === undefined
        ? targetTrades.length
        : Math.min(targetIndex, targetTrades.length)
      targetTrades.splice(insertionIndex, 0, moved)

      const nextSource = this.normalizeTrades(sourceTrades)
      const nextTarget = this.normalizeTrades(targetTrades)
      try {
        await this.persistTrades(nextSource, sourceFolderId)
        await this.persistTrades(nextTarget, targetFolderId)
      } catch (error) {
        // Sync has no transaction. Restore both snapshots so the cache and the
        // published manifests converge on the same state after a partial write.
        const rollback = await Promise.allSettled([
          this.persistTrades(sourceSnapshot, sourceFolderId),
          this.persistTrades(targetSnapshot, targetFolderId)
        ])
        if (rollback.some((result) => result.status === "rejected")) {
          this.tradesCache.delete(sourceFolderId)
          this.tradesCache.delete(targetFolderId)
          this.tradesRequests.delete(sourceFolderId)
          this.tradesRequests.delete(targetFolderId)
        }
        throw error
      }

      return {
        sourceTrades: this.cloneTrades(nextSource),
        targetTrades: this.cloneTrades(nextTarget)
      }
    })
  }

  async moveFolder(
    folderId: string,
    newIndex: number,
    options: { version: TradeSiteVersion; archived: boolean }
  ) {
    const folders = await this.fetchFolders()
    const matchingFolders = folders.filter(
      (folder) =>
        folder.version === options.version &&
        !!folder.archivedAt === options.archived
    )
    const currentIndex = matchingFolders.findIndex(
      (folder) => folder.id === folderId
    )
    if (currentIndex === -1) return

    const safeIndex = Math.max(
      0,
      Math.min(newIndex, matchingFolders.length - 1)
    )
    if (currentIndex === safeIndex) return

    const reorderedFolders = [...matchingFolders]
    const [movedFolder] = reorderedFolders.splice(currentIndex, 1)
    reorderedFolders.splice(safeIndex, 0, movedFolder)

    const updatedFolders = this.partiallyReorderFolders(
      folders,
      reorderedFolders
    )
    await this.persistFolders(updatedFolders)
    await this.refresh()
  }

  // ─── LOGIC ────────────────────────────────────────────────

  async toggleTradeCompletion(
    trade: BookmarksTradeStruct,
    folderId: string
  ): Promise<BookmarksTradeStruct[]> {
    const trades = await this.fetchTradesByFolderId(folderId, { force: true })
    const updated = trades.map((entry) =>
      entry.id === trade.id
        ? {
            ...entry,
            completedAt: entry.completedAt ? null : new Date().toISOString()
          }
        : entry
    )
    const persisted = await this.persistTrades(updated, folderId)
    await this.refresh()
    return persisted
  }

  async toggleTradeArchive(
    trade: BookmarksTradeStruct,
    folderId: string
  ): Promise<BookmarksTradeStruct[]> {
    const trades = await this.fetchTradesByFolderId(folderId, { force: true })
    const updated = trades.map((entry) =>
      entry.id === trade.id
        ? {
            ...entry,
            archivedAt: entry.archivedAt ? null : new Date().toISOString()
          }
        : entry
    )
    const persisted = await this.persistTrades(updated, folderId)
    await this.refresh()
    return persisted
  }

  async toggleFolderArchive(folder: BookmarksFolderStruct) {
    return this.persistFolder(
      {
        ...folder,
        archivedAt: folder.archivedAt ? null : new Date().toISOString()
      },
      { moveToEnd: true }
    )
  }

  async createCategory(
    folder: BookmarksFolderStruct,
    title: string
  ): Promise<BookmarksCategoryStruct | null> {
    if (!folder.id) return null
    const category: BookmarksCategoryStruct = {
      id: uniqueId(),
      title
    }
    const categories = [...(folder.categories || []), category]
    await this.persistFolder({ ...folder, categories })
    return category
  }

  async renameCategory(
    folder: BookmarksFolderStruct,
    categoryId: string,
    title: string
  ) {
    const categories = (folder.categories || []).map((category) =>
      category.id === categoryId ? { ...category, title } : category
    )
    await this.persistFolder({ ...folder, categories })
  }

  async deleteCategory(
    folder: BookmarksFolderStruct,
    categoryId: string
  ): Promise<BookmarksTradeStruct[]> {
    if (!folder.id) return []
    const categories = (folder.categories || []).filter(
      (category) => category.id !== categoryId
    )
    await this.persistFolder({ ...folder, categories })

    const trades = await this.fetchTradesByFolderId(folder.id, { force: true })
    const updatedTrades = trades.map((trade) =>
      trade.categoryId === categoryId ? { ...trade, categoryId: null } : trade
    )
    const persisted = await this.persistTrades(updatedTrades, folder.id)
    await this.refresh()
    return persisted
  }

  partiallyReorderFolders(
    allFolders: BookmarksFolderStruct[],
    reorderedFolders: BookmarksFolderStruct[]
  ): BookmarksFolderStruct[] {
    const reorderedSet = new Set(reorderedFolders)
    const result = [...allFolders]
    let reorderedIndex = 0
    for (let i = 0; i < allFolders.length; i++) {
      if (reorderedSet.has(allFolders[i])) {
        result[i] = reorderedFolders[reorderedIndex]
        reorderedIndex++
      }
    }
    return result
  }

  // ─── EXPORT / IMPORT ──────────────────────────────────────

  serializeFolder(
    folder: BookmarksFolderStruct,
    trades: BookmarksTradeStruct[]
  ): string {
    const payload: ExportedFolderStruct = {
      icn: folder.icon as string,
      tit: folder.title,
      ver: folder.version,
      cats: (folder.categories || []).map((category) => ({
        id: category.id,
        tit: category.title
      })),
      trs: trades.map((t) => ({
        tit: t.title,
        loc: `${t.location.version}:${t.location.type}:${t.location.league || ""}:${t.location.slug}`,
        cat: t.categoryId || undefined
      }))
    }
    return `5:${encodeBase64Utf8(JSON.stringify(payload))}`
  }

  deserializeFolder(
    serializedFolder: string
  ): [BookmarksFolderStruct, BookmarksTradeStruct[]] | null {
    try {
      const exportVersion = this.parseExportVersion(serializedFolder)
      const json = this.jsonFromExportString(exportVersion, serializedFolder)
      const payload: ExportedFolderStruct = JSON.parse(json)

      const folder: BookmarksFolderStruct = {
        version: "1",
        icon: payload.icn as BookmarksFolderIcon,
        title: payload.tit,
        archivedAt: null,
        categories: []
      }

      if (exportVersion >= 3 && payload.ver) {
        folder.version = payload.ver
      }

      if (exportVersion >= 5 && Array.isArray(payload.cats)) {
        folder.categories = payload.cats
          .filter((category) => category.id && category.tit)
          .map((category) => ({ id: category.id, title: category.tit }))
      }

      const trades: BookmarksTradeStruct[] = payload.trs.map((trade) => {
        let version: string, type: string, slug: string, league: string | null
        if (exportVersion >= 4) {
          ;[version, type, league, slug] = trade.loc.split(":")
        } else if (exportVersion >= 3) {
          ;[version, type, slug] = trade.loc.split(":")
          league = null
        } else {
          version = "1"
          ;[type, slug] = trade.loc.split(":")
          league = null
        }
        return {
          title: trade.tit,
          completedAt: null,
          archivedAt: null,
          categoryId: exportVersion >= 5 && trade.cat ? trade.cat : null,
          location: { version: version as TradeSiteVersion, type, slug, league }
        }
      })

      return [folder, trades]
    } catch {
      return null
    }
  }

  private parseExportVersion(exportString: string): ExportVersion {
    if (exportString.startsWith("5:")) return 5
    if (exportString.startsWith("4:")) return 4
    if (exportString.startsWith("3:")) return 3
    if (exportString.startsWith("2:")) return 2
    return 1
  }

  private jsonFromExportString(
    version: ExportVersion,
    exportString: string
  ): string {
    if (version >= 2) {
      return decodeBase64Utf8(exportString.slice(2))
    }
    return atob(exportString)
  }

  // ─── BACKUP / RESTORE ─────────────────────────────────────

  async generateBackupDataString(): Promise<string> {
    const activeFolderStrings: string[] = []
    const archivedFolderStrings: string[] = []

    const folders = await this.fetchFolders()
    for (const folder of folders) {
      if (!folder.id) continue
      const trades = await this.fetchTradesByFolderId(folder.id)
      const serialized = this.serializeFolder(folder, trades)
      ;(folder.archivedAt ? archivedFolderStrings : activeFolderStrings).push(
        serialized
      )
    }

    return [
      activeFolderStrings.join(LINE_DELIMITER),
      archivedFolderStrings.join(LINE_DELIMITER)
    ].join(SECTION_DELIMITER)
  }

  async restoreFromDataString(dataString: string): Promise<boolean> {
    try {
      const [activeSection, archivedSection] =
        dataString.split(SECTION_DELIMITER)
      const activeFolderStrings = activeSection
        .split(LINE_DELIMITER)
        .filter(Boolean)
      const archivedFolderStrings = (archivedSection || "")
        .split(LINE_DELIMITER)
        .filter(Boolean)

      let restoredCount = 0
      restoredCount += await this.restoreFolders(activeFolderStrings)
      restoredCount += await this.restoreFolders(archivedFolderStrings, {
        archivedAt: new Date().toISOString()
      })

      await this.refresh()
      return restoredCount > 0
    } catch {
      return false
    }
  }

  private async restoreFolders(
    folderStrings: string[],
    overrides: Partial<BookmarksFolderStruct> = {}
  ): Promise<number> {
    let count = 0
    for (const folderString of folderStrings) {
      const deserialized = this.deserializeFolder(folderString)
      if (!deserialized) continue

      const [folder, trades] = deserialized
      const folderId = await this.persistFolder({ ...folder, ...overrides })
      await this.persistTrades(trades, folderId)
      count++
    }
    return count
  }

  // ─── HELPERS ──────────────────────────────────────────────

  initializeFolderStruct(
    version: TradeSiteVersion,
    partial?: Partial<BookmarksFolderStruct>
  ): BookmarksFolderStruct {
    return {
      version,
      icon: null,
      title: "",
      archivedAt: null,
      ...partial,
      categories: this.normalizeCategories(partial?.categories)
    }
  }

  initializeTradeStructFrom(location: {
    version: TradeSiteVersion
    type: string
    slug: string
    league: string | null
  }): BookmarksTradeStruct {
    return {
      location,
      title: "",
      completedAt: null,
      archivedAt: null,
      categoryId: null
    }
  }
}

export const bookmarksService = new BookmarksService()
