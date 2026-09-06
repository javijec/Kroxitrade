export type TradeSyncOutcome = "sync" | "invalidate" | "ignore"

export type TradeSyncInput = {
  folderId: string | null | undefined
  eventFolderId: string | null | undefined
  tradesChanged: boolean
  isExpanded: boolean
  isCommittingDraft: boolean
}

/**
 * Picks how a folder reacts to a bookmarks change event.
 *
 * Committing a draft yields `ignore`: `persistTrades` notifies before its
 * awaits, so syncing then would render the stored row next to the still-open
 * draft input until the write resolves.
 */
export const decideTradeSync = ({
  folderId,
  eventFolderId,
  tradesChanged,
  isExpanded,
  isCommittingDraft
}: TradeSyncInput): TradeSyncOutcome => {
  if (!folderId || !tradesChanged || eventFolderId !== folderId) return "ignore"
  if (isCommittingDraft) return "ignore"

  return isExpanded ? "sync" : "invalidate"
}
