import type {
  BookmarksFolderStruct,
  BookmarksTradeStruct
} from "../types/bookmarks"
import { uniqueId } from "../utilities/unique-id"

export const BOOKMARK_REPOSITORY_JOURNAL_KEY = "bookmark-repository-journal"

export type BookmarkRepositoryOperation =
  | {
      id: string
      revision: number
      updatedAt: number
      type: "folders"
      folders: BookmarksFolderStruct[]
    }
  | {
      id: string
      revision: number
      updatedAt: number
      type: "trades"
      folderId: string
      trades: BookmarksTradeStruct[]
    }
  | {
      id: string
      revision: number
      updatedAt: number
      type: "delete-folder"
      folderId: string
    }

export interface BookmarkRepositoryJournal {
  version: 1
  revision: number
  operations: BookmarkRepositoryOperation[]
}

type StagedBookmarkRepositoryOperation =
  | Omit<
      Extract<BookmarkRepositoryOperation, { type: "folders" }>,
      "id" | "revision" | "updatedAt"
    >
  | Omit<
      Extract<BookmarkRepositoryOperation, { type: "trades" }>,
      "id" | "revision" | "updatedAt"
    >
  | Omit<
      Extract<BookmarkRepositoryOperation, { type: "delete-folder" }>,
      "id" | "revision" | "updatedAt"
    >

const cloneTrade = (trade: BookmarksTradeStruct): BookmarksTradeStruct => ({
  ...trade,
  location: { ...trade.location }
})

const cloneFolder = (folder: BookmarksFolderStruct): BookmarksFolderStruct => ({
  ...folder,
  categories: (folder.categories || []).map((category) => ({ ...category }))
})

const uniqueTrades = (trades: BookmarksTradeStruct[]) => {
  const ids = new Set<string>()
  return trades.filter((trade) => {
    if (!trade.id || !ids.has(trade.id)) {
      if (trade.id) ids.add(trade.id)
      return true
    }
    return false
  })
}

/**
 * The local source of truth for bookmarks. It intentionally stores snapshots
 * as idempotent operations: replaying a pending operation after a reload
 * produces the same final state and never appends a bookmark twice.
 */
export class BookmarkRepository {
  private revision = 0
  private folders: BookmarksFolderStruct[] = []
  private tradesByFolder = new Map<string, BookmarksTradeStruct[]>()
  private operations = new Map<string, BookmarkRepositoryOperation>()

  hydrate(journal: BookmarkRepositoryJournal | null | undefined) {
    if (!journal || journal.version !== 1) return
    this.revision = Math.max(this.revision, journal.revision || 0)
    for (const operation of [...(journal.operations || [])].sort(
      (left, right) =>
        left.revision - right.revision ||
        (left.updatedAt || 0) - (right.updatedAt || 0) ||
        left.id.localeCompare(right.id)
    )) {
      this.track(operation)
    }
  }

  replaceFolders(folders: BookmarksFolderStruct[]) {
    this.folders = folders.map(cloneFolder)
    this.replayPending((operation) => operation.type !== "trades")
  }

  replaceTrades(folderId: string, trades: BookmarksTradeStruct[]) {
    this.tradesByFolder.set(folderId, uniqueTrades(trades).map(cloneTrade))
    this.replayPending(
      (operation) =>
        (operation.type === "trades" || operation.type === "delete-folder") &&
        operation.folderId === folderId
    )
  }

  getFolders() {
    return this.folders.map(cloneFolder)
  }

  getTrades(folderId: string) {
    return (this.tradesByFolder.get(folderId) || []).map(cloneTrade)
  }

  hasTrades(folderId: string) {
    return this.tradesByFolder.has(folderId)
  }

  hasPendingOperations() {
    return this.operations.size > 0
  }

  pendingOperations() {
    return [...this.operations.values()].sort(
      (left, right) =>
        left.revision - right.revision ||
        (left.updatedAt || 0) - (right.updatedAt || 0) ||
        left.id.localeCompare(right.id)
    )
  }

  stageFolders(folders: BookmarksFolderStruct[]) {
    return this.stage({ type: "folders", folders: folders.map(cloneFolder) })
  }

  stageTrades(folderId: string, trades: BookmarksTradeStruct[]) {
    return this.stage({
      type: "trades",
      folderId,
      trades: uniqueTrades(trades).map(cloneTrade)
    })
  }

  stageFolderDeletion(folderId: string) {
    return this.stage({ type: "delete-folder", folderId })
  }

  cancelFolderDeletion(folderId: string) {
    for (const [id, operation] of this.operations) {
      if (operation.type === "delete-folder" && operation.folderId === folderId) {
        this.operations.delete(id)
      }
    }
  }

  acknowledge(operationId: string) {
    this.operations.delete(operationId)
  }

  journal(): BookmarkRepositoryJournal {
    return {
      version: 1,
      revision: this.revision,
      operations: [...this.operations.values()]
    }
  }

  private stage(
    operation: StagedBookmarkRepositoryOperation
  ) {
    const staged = {
      ...operation,
      id: uniqueId(),
      revision: ++this.revision,
      updatedAt: Date.now()
    } as BookmarkRepositoryOperation
    // Only the newest snapshot per resource is relevant. This is the durable
    // equivalent of coalescing rapid UI interactions during the debounce.
    const resource =
      staged.type === "folders"
        ? "folders"
        : `${staged.type}:${staged.folderId}`
    for (const [id, pending] of this.operations) {
      const pendingResource =
        pending.type === "folders"
          ? "folders"
          : `${pending.type}:${pending.folderId}`
      if (pendingResource === resource) this.operations.delete(id)
    }
    this.track(staged)
    return staged
  }

  private track(operation: BookmarkRepositoryOperation) {
    const resource = this.resourceFor(operation)
    for (const [id, pending] of this.operations) {
      if (this.resourceFor(pending) === resource) this.operations.delete(id)
    }
    if (operation.type === "delete-folder") {
      for (const [id, pending] of this.operations) {
        if (pending.type === "trades" && pending.folderId === operation.folderId) {
          this.operations.delete(id)
        }
      }
    }
    this.operations.set(operation.id, operation)
    this.applyState(operation)
  }

  private resourceFor(operation: BookmarkRepositoryOperation) {
    return operation.type === "folders"
      ? "folders"
      : `${operation.type}:${operation.folderId}`
  }

  private replayPending(
    matches: (operation: BookmarkRepositoryOperation) => boolean
  ) {
    this.pendingOperations()
      .filter(matches)
      .forEach((operation) => this.applyState(operation))
  }

  private applyState(operation: BookmarkRepositoryOperation) {
    this.revision = Math.max(this.revision, operation.revision)
    if (operation.type === "folders") {
      this.folders = operation.folders.map(cloneFolder)
    } else if (operation.type === "trades") {
      this.tradesByFolder.set(
        operation.folderId,
        uniqueTrades(operation.trades).map(cloneTrade)
      )
    } else {
      this.folders = this.folders.filter((folder) => folder.id !== operation.folderId)
      this.tradesByFolder.delete(operation.folderId)
    }
  }
}
