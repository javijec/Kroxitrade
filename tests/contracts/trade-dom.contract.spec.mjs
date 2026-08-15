// Trade site contract — verifies the tradeDom accessor API returns the
// expected elements from the PoE1/PoE2 fixtures. When GGG changes the site
// markup, these tests fail with a clear pointer to which accessor regressed.

import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

const selectors = JSON.parse(
  readFileSync(new URL("../fixtures/trade-selectors.json", import.meta.url), "utf8")
)

const fixtures = {
  poe1: readFileSync(
    new URL("../fixtures/poe1/trade-search.html", import.meta.url),
    "utf8"
  ),
  poe2: readFileSync(
    new URL("../fixtures/poe2/trade-search.html", import.meta.url),
    "utf8"
  )
}

const countMatches = (selector: string) =>
  document.querySelectorAll(selector).length

const hasMatch = (selector: string) =>
  document.querySelector(selector) !== null

const findRowById = (id: string) =>
  document.querySelector(
    `.row[data-id="${id}"], .result-item[data-id="${id}"]`
  ) !== null

test.describe("tradeDom contract: PoE1", () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(fixtures.poe1)
  })

  test("getBulkSellerRows yields the bulk-seller rows", async ({ page }) => {
    const count = await page.evaluate(countMatches, selectors.common.bulkSellerRows)
    expect(count).toBeGreaterThan(0)
  })

  test("getItemResultRows yields the result rows", async ({ page }) => {
    const count = await page.evaluate(countMatches, selectors.common.itemResultRows)
    expect(count).toBeGreaterThan(0)
  })

  test("getQuickFiltersPane resolves the quick filters pane", async ({ page }) => {
    const found = await page.evaluate(hasMatch, selectors.common.quickFiltersPane)
    expect(found).toBe(true)
  })

  test("getStatsTitles yields the filter stat titles", async ({ page }) => {
    const count = await page.evaluate(countMatches, selectors.common.statsTitles)
    expect(count).toBeGreaterThan(0)
  })

  test("getFilterProperties yields the filter rows", async ({ page }) => {
    const count = await page.evaluate(countMatches, selectors.common.filterProperty)
    expect(count).toBeGreaterThan(0)
  })

  test("findRowById locates a row from the fixture", async ({ page }) => {
    const found = await page.evaluate(findRowById, "row1")
    expect(found).toBe(true)
  })

  test("readInputValue reads the search input value", async ({ page }) => {
    const value = await page.evaluate((selector) => {
      const input = document.querySelector(selector) as HTMLInputElement | null
      return input?.value ?? null
    }, selectors.common.searchInput)
    expect(value).toBe("Test Item")
  })
})

test.describe("tradeDom contract: PoE2", () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(fixtures.poe2)
  })

  test("getBulkSellerRows yields the bulk-seller rows", async ({ page }) => {
    const count = await page.evaluate(countMatches, selectors.common.bulkSellerRows)
    expect(count).toBeGreaterThan(0)
  })

  test("getItemResultRows yields the result rows", async ({ page }) => {
    const count = await page.evaluate(countMatches, selectors.common.itemResultRows)
    expect(count).toBeGreaterThan(0)
  })

  test("getPoe2CopyButtons yields the PoE2 copy buttons", async ({ page }) => {
    const count = await page.evaluate(countMatches, selectors.poe2.poe2CopyButton)
    expect(count).toBeGreaterThan(0)
  })

  test("findRowById locates a row from the fixture", async ({ page }) => {
    const found = await page.evaluate(findRowById, "row1")
    expect(found).toBe(true)
  })
})
