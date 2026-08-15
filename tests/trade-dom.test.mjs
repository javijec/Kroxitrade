import assert from "node:assert/strict"
import test from "node:test"

import { bulkSellerRows } from "../lib/site-adapter/selectors/common.ts"
import { itemResultRows } from "../lib/site-adapter/selectors/common.ts"
import { quickFiltersPane } from "../lib/site-adapter/selectors/common.ts"
import { statsTitles } from "../lib/site-adapter/selectors/common.ts"
import { filterProperty } from "../lib/site-adapter/selectors/common.ts"
import { poe2CopyButton } from "../lib/site-adapter/selectors/poe2.ts"

class MockElement {
  constructor({ className = "", value = "", innerText = "" } = {}) {
    this.className = className
    this.value = value
    this.innerText = innerText
  }
}

const makeDocument = (overrides = {}) => {
  const calls = []
  const querySelector = (selector) => {
    calls.push({ method: "querySelector", selector })
    return overrides.querySelector?.(selector) ?? null
  }
  const querySelectorAll = (selector) => {
    calls.push({ method: "querySelectorAll", selector })
    return overrides.querySelectorAll?.(selector) ?? []
  }
  return { calls, querySelector, querySelectorAll }
}

const installDom = (doc) => {
  globalThis.document = doc
  globalThis.CSS = {
    escape: (value) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  }
}

const { tradeDom } = await import("../lib/site-adapter/trade-dom.ts")

test("getBulkSellerRows queries with the bulkSellerRows selector", () => {
  const row = new MockElement({ className: "row" })
  const doc = makeDocument({
    querySelectorAll: (selector) => (selector === bulkSellerRows ? [row] : [])
  })
  installDom(doc)

  const rows = tradeDom.getBulkSellerRows()
  assert.equal(rows.length, 1)
  assert.equal(rows[0], row)
  assert.equal(doc.calls[0].method, "querySelectorAll")
  assert.equal(doc.calls[0].selector, bulkSellerRows)
})

test("findRowById escapes the id and queries the matched-row selector", () => {
  const row = new MockElement({ className: "row" })
  const expected = `.row[data-id="abc"], .result-item[data-id="abc"]`
  const doc = makeDocument({
    querySelector: (selector) => (selector === expected ? row : null)
  })
  installDom(doc)

  const found = tradeDom.findRowById("abc")
  assert.equal(found, row)
  assert.equal(doc.calls[0].method, "querySelector")
  assert.equal(doc.calls[0].selector, expected)
})

test("findRowById escapes id values that contain quotes", () => {
  const doc = makeDocument({ querySelector: () => null })
  installDom(doc)

  tradeDom.findRowById('a"b')
  // CSS.escape is mocked to replace " with \"
  assert.ok(
    doc.calls[0].selector.includes('data-id="a\\"b"'),
    `selector did not escape the quote: ${doc.calls[0].selector}`
  )
})

test("findRowById returns null when no row matches", () => {
  const doc = makeDocument({ querySelector: () => null })
  installDom(doc)

  assert.equal(tradeDom.findRowById("missing"), null)
})

test("getItemResultRows queries with the itemResultRows selector", () => {
  const row = new MockElement({ className: "result-item" })
  const doc = makeDocument({
    querySelectorAll: (selector) => (selector === itemResultRows ? [row] : [])
  })
  installDom(doc)

  const rows = tradeDom.getItemResultRows()
  assert.equal(rows.length, 1)
  assert.equal(rows[0], row)
  assert.equal(doc.calls[0].selector, itemResultRows)
})

test("getQuickFiltersPane returns the pane or null", () => {
  const pane = new MockElement({ className: "search-advanced-pane brown" })
  const found = makeDocument({
    querySelector: (selector) => (selector === quickFiltersPane ? pane : null)
  })
  installDom(found)
  assert.equal(tradeDom.getQuickFiltersPane(), pane)

  const empty = makeDocument({ querySelector: () => null })
  installDom(empty)
  assert.equal(tradeDom.getQuickFiltersPane(), null)
})

test("getStatsTitles queries with the statsTitles selector", () => {
  const title = new MockElement({ innerText: "Fire Resistance" })
  const doc = makeDocument({
    querySelectorAll: (selector) => (selector === statsTitles ? [title] : [])
  })
  installDom(doc)

  const titles = tradeDom.getStatsTitles()
  assert.equal(titles.length, 1)
  assert.equal(titles[0].innerText, "Fire Resistance")
  assert.equal(doc.calls[0].selector, statsTitles)
})

test("readInputValue returns the value when the input is present", () => {
  const input = new MockElement({ value: "Chaos Orb" })
  const doc = makeDocument({
    querySelector: (selector) => (selector === ".some-input" ? input : null)
  })
  installDom(doc)

  assert.equal(tradeDom.readInputValue(".some-input"), "Chaos Orb")
  assert.equal(doc.calls[0].selector, ".some-input")
})

test("readInputValue returns null when the input is missing", () => {
  const doc = makeDocument({ querySelector: () => null })
  installDom(doc)

  assert.equal(tradeDom.readInputValue(".missing"), null)
})

test("readInputValue returns null when the value matches the placeholder", () => {
  const input = new MockElement({ value: "Any" })
  const doc = makeDocument({
    querySelector: (selector) => (selector === ".category" ? input : null)
  })
  installDom(doc)

  assert.equal(tradeDom.readInputValue(".category", "Any"), null)
})

test("readInputValue returns the value when it differs from the placeholder", () => {
  const input = new MockElement({ value: "Helmet" })
  const doc = makeDocument({
    querySelector: (selector) => (selector === ".category" ? input : null)
  })
  installDom(doc)

  assert.equal(tradeDom.readInputValue(".category", "Any"), "Helmet")
})

test("readInputValue returns null when the value is empty", () => {
  const input = new MockElement({ value: "" })
  const doc = makeDocument({
    querySelector: (selector) => (selector === ".category" ? input : null)
  })
  installDom(doc)

  assert.equal(tradeDom.readInputValue(".category"), null)
})

test("getPoe2CopyButtons queries with the PoE2 copy selector", () => {
  const button = new MockElement({ className: "copy" })
  const doc = makeDocument({
    querySelectorAll: (selector) => (selector === poe2CopyButton ? [button] : [])
  })
  installDom(doc)

  const buttons = tradeDom.getPoe2CopyButtons()
  assert.equal(buttons.length, 1)
  assert.equal(buttons[0], button)
  assert.equal(doc.calls[0].selector, poe2CopyButton)
})

test("getFilterProperties queries with the filterProperty selector", () => {
  const filter = new MockElement({ className: "filter filter-property" })
  const doc = makeDocument({
    querySelectorAll: (selector) => (selector === filterProperty ? [filter] : [])
  })
  installDom(doc)

  const filters = tradeDom.getFilterProperties()
  assert.equal(filters.length, 1)
  assert.equal(filters[0], filter)
  assert.equal(doc.calls[0].selector, filterProperty)
})
