export const BOOKMARK_DRAG_MIME_TYPE = "application/x-poe-trade-plus-drag"

export type TradeDragPayload = {
  type: "trade"
  tradeId: string
  sourceFolderId: string
}

export type FolderDragPayload = {
  type: "folder"
  folderId: string
}

export type CategoryDragPayload = {
  type: "category"
  folderId: string
  categoryId: string
  categoryIndex: number
}

export type BookmarkDragPayload =
  | TradeDragPayload
  | FolderDragPayload
  | CategoryDragPayload

export const parseBookmarkDragPayload = (raw: string): BookmarkDragPayload | null => {
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== "object") return null
    const payload = value as Record<string, unknown>
    if (payload.type === "trade" && typeof payload.tradeId === "string" && typeof payload.sourceFolderId === "string") {
      return { type: "trade", tradeId: payload.tradeId, sourceFolderId: payload.sourceFolderId }
    }
    if (payload.type === "folder" && typeof payload.folderId === "string") {
      return { type: "folder", folderId: payload.folderId }
    }
    if (payload.type === "category" && typeof payload.folderId === "string" && typeof payload.categoryId === "string" && Number.isInteger(payload.categoryIndex)) {
      return { type: "category", folderId: payload.folderId, categoryId: payload.categoryId, categoryIndex: payload.categoryIndex as number }
    }
  } catch {
    // Invalid external payloads are not part of the bookmark drag protocol.
  }
  return null
}

export const setBookmarkDragPayload = (transfer: DataTransfer, payload: BookmarkDragPayload) => {
  const serialized = JSON.stringify(payload)
  transfer.setData(BOOKMARK_DRAG_MIME_TYPE, serialized)
  transfer.setData("text/plain", serialized)
}
