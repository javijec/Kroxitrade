import assert from "node:assert/strict"
import test from "node:test"

const { canCancelDraftSave } = await import(
  "../lib/services/bookmark-draft-save.ts"
)

test("does not let Escape dismiss a draft while its save is in flight", () => {
  assert.equal(canCancelDraftSave(true), false)
})

test("allows Escape to dismiss an idle draft", () => {
  assert.equal(canCancelDraftSave(false), true)
})
