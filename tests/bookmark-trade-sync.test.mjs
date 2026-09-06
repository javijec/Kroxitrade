// Saving a search stages the row and notifies subscribers before the journal
// write resolves. Syncing on that notification while the draft input is still
// open rendered the same search twice until the write finished.

import assert from "node:assert/strict"
import test from "node:test"

const { decideTradeSync } = await import("../lib/services/bookmark-trade-sync.ts")

const base = {
  folderId: "folder-1",
  eventFolderId: "folder-1",
  tradesChanged: true,
  isExpanded: true,
  isCommittingDraft: false
}

test("holds the sync while a draft is being committed", () => {
  // Arrange: the notification that persistTrades fires before its awaits.
  const input = { ...base, isCommittingDraft: true }

  // Act
  const outcome = decideTradeSync(input)

  // Assert: no sync, so the stored row cannot appear beside the draft input.
  assert.equal(outcome, "ignore")
})

test("does not invalidate a collapsed folder mid-commit", () => {
  const input = { ...base, isExpanded: false, isCommittingDraft: true }
  assert.equal(decideTradeSync(input), "ignore")
})

test("syncs an expanded folder once no draft is in flight", () => {
  assert.equal(decideTradeSync(base), "sync")
})

test("invalidates a collapsed folder instead of syncing it", () => {
  assert.equal(decideTradeSync({ ...base, isExpanded: false }), "invalidate")
})

test("ignores events for another folder", () => {
  assert.equal(decideTradeSync({ ...base, eventFolderId: "folder-2" }), "ignore")
})

test("ignores events that did not change trades", () => {
  assert.equal(decideTradeSync({ ...base, tradesChanged: false }), "ignore")
})

test("ignores events when the folder has no id yet", () => {
  assert.equal(decideTradeSync({ ...base, folderId: null, eventFolderId: null }), "ignore")
  assert.equal(decideTradeSync({ ...base, folderId: undefined }), "ignore")
})

test("ignores a broadcast with no folder id against a real folder", () => {
  assert.equal(decideTradeSync({ ...base, eventFolderId: undefined }), "ignore")
})
