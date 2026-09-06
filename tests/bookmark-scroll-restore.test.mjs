// The bookmark list stores its scroll offset when a saved search is opened and
// restores it after the trade page navigates. Retries are needed because rows
// load asynchronously, but a retry that outlives the user's wheel made the list
// unscrollable whenever the content stayed shorter than the saved offset.

import assert from "node:assert/strict"
import test from "node:test"

const { decideScrollRestore } = await import("../lib/services/bookmark-scroll-restore.ts")

const base = {
  savedTop: 400,
  scrollHeight: 2000,
  clientHeight: 800,
  userInteracted: false
}

test("aborts as soon as the user scrolls, even while the offset is unreachable", () => {
  // Arrange: offset out of reach, so the loop is mid-retry.
  const input = { ...base, scrollHeight: 500, clientHeight: 800, userInteracted: true }

  // Act
  const outcome = decideScrollRestore(input)

  // Assert: the user wins. This stayed "retry" before the fix.
  assert.equal(outcome, "abort")
})

test("aborts on user input even when the offset is reachable", () => {
  assert.equal(decideScrollRestore({ ...base, userInteracted: true }), "abort")
})

test("settles once the saved offset is reachable", () => {
  assert.equal(decideScrollRestore(base), "settle")
})

test("settles on the exact boundary where the offset just fits", () => {
  const input = { ...base, savedTop: 1200, scrollHeight: 2000, clientHeight: 800 }
  assert.equal(decideScrollRestore(input), "settle")
})

test("retries while the content is still shorter than the saved offset", () => {
  // Reported trigger: expanding another folder grows scrollHeight and settles.
  const short = { ...base, savedTop: 1201, scrollHeight: 2000, clientHeight: 800 }
  assert.equal(decideScrollRestore(short), "retry")

  const grown = { ...short, scrollHeight: 2400 }
  assert.equal(decideScrollRestore(grown), "settle")
})

test("is idle when nothing was stored", () => {
  assert.equal(decideScrollRestore({ ...base, savedTop: null }), "idle")
})

test("is idle for a non-finite or negative offset", () => {
  assert.equal(decideScrollRestore({ ...base, savedTop: Number.NaN }), "idle")
  assert.equal(decideScrollRestore({ ...base, savedTop: Number.POSITIVE_INFINITY }), "idle")
  assert.equal(decideScrollRestore({ ...base, savedTop: -1 }), "idle")
})

test("treats a container with no overflow as reachable at offset 0", () => {
  const input = { ...base, savedTop: 0, scrollHeight: 600, clientHeight: 800 }
  assert.equal(decideScrollRestore(input), "settle")
})

test("never reports a negative reachable range", () => {
  // maxTop must clamp at 0 rather than go negative.
  const input = { ...base, savedTop: 1, scrollHeight: 100, clientHeight: 900 }
  assert.equal(decideScrollRestore(input), "retry")
})
