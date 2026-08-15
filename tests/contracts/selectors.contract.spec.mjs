// Validates the shared selector strings against real DOM built from the
// PoE1/PoE2 fixture pages. Expected counts describe the fixture markup, so a
// drift in either the selectors or the fixtures fails loudly.

import { readFileSync } from "node:fs"
import { test, expect } from "@playwright/test"

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

const assertCounts = async (page, group, counts) => {
  for (const [name, expected] of Object.entries(counts)) {
    const selector = selectors[group][name]
    const full = name.endsWith("Class") ? `.${selector}` : selector
    await expect(page.locator(full)).toHaveCount(expected, {
      timeout: 5_000
    })
  }
}

test.describe("PoE1 selectors against the PoE1 fixture", () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(fixtures.poe1)
  })

  test("structure selectors match the fixture", async ({ page }) => {
    await assertCounts(page, "common", {
      resultsContainer: 2,
      bulkSellerRows: 2,
      itemResultRows: 2,
      finerResultRows: 2,
      mods: 6,
      modsForAction: 6,
      modHashField: 6,
      modLabelField: 6,
      modValueField: 6,
      searchInput: 1,
      searchButton: 1,
      layoutButton: 0,
      categoryInput: 0,
      rarityInput: 0,
      directBuyButton: 0
    })
  })

  test("filter panel selectors match the fixture", async ({ page }) => {
    await assertCounts(page, "common", {
      quickFiltersPane: 1,
      expandedFilterGroup: 1,
      filterProperty: 2,
      filterTitle: 3,
      statsTitles: 3,
      multiselect: 2,
      multiselectInput: 2,
      multiselectOption: 2,
      multiselectItem: 3,
      buyoutPriceInputs: 3
    })
  })

  test("item popup and result row selectors match the fixture", async ({
    page
  }) => {
    await assertCounts(page, "common", {
      resultRowId: 11,
      resultRowAncestor: 3,
      modElement: 6,
      uniqueItemPopup: 1,
      compactResults: 1,
      itemPopup: 2,
      itemPopupHeaderLine: 2,
      itemPopupContent: 2,
      uniqueItemHeader: 2,
      itemTitleLine: 2,
      itemDetails: 0,
      sellerName: 2,
      pinnedItemDetails: 2,
      itemRendered: 0
    })
  })

  test("pricing and modifier selectors match the fixture", async ({ page }) => {
    await assertCounts(page, "common", {
      itemPrice: 4,
      itemPriceIcon: 0,
      priceNote: 0,
      priceInfo: 4,
      priceCurrency: 4,
      modStatField: 6,
      qualityDataField: 1,
      itemLevelDataField: 1,
      flagsSeparator: 1,
      explicitSeparator: 2,
      itemLevelField: 1,
      socket: 2,
      itemIcon: 1,
      modValueSpan: 6
    })
  })

  test("PoE1-only mod classes match the fixture", async ({ page }) => {
    await assertCounts(page, "poe1", {
      modImplicitClass: 1,
      modExplicitClass: 3,
      modMutatedClass: 2,
      modFracturedClass: 1,
      modCraftedClass: 0,
      modDesecratedClass: 0,
      mutatedModContainer: 2,
      implicitMod: 1,
      fracturedMod: 1,
      explicitMods: 4,
      explicitModsWithDesecrated: 4
    })
  })

  test("containerModItems resolves per item popup scope", async ({ page }) => {
    const content = page.locator(".item-popup__content")
    await expect(
      content.first().locator(selectors.poe1.containerModItems)
    ).toHaveCount(2)
    await expect(
      content.nth(1).locator(selectors.poe1.containerModItems)
    ).toHaveCount(3)
  })

  test("itemTitleCandidates keep their priority order", async ({ page }) => {
    const candidates = selectors.common.itemTitleCandidates
    for (const selector of candidates.slice(0, 4)) {
      await expect(page.locator(selector)).toHaveCount(0)
    }
    await expect(page.locator(candidates[4])).toHaveCount(2)
    await expect(page.locator(candidates[5])).toHaveCount(2)
    for (const selector of candidates.slice(6)) {
      await expect(page.locator(selector)).toHaveCount(0)
    }
  })
})

test.describe("PoE2 selectors against the PoE2 fixture", () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(fixtures.poe2)
  })

  test("structure selectors match the fixture", async ({ page }) => {
    await assertCounts(page, "common", {
      resultsContainer: 1,
      bulkSellerRows: 1,
      itemResultRows: 1,
      finerResultRows: 2,
      mods: 3,
      modsForAction: 3,
      modHashField: 3,
      modLabelField: 3,
      modValueField: 3,
      searchInput: 1,
      searchButton: 1,
      quickFiltersPane: 1,
      expandedFilterGroup: 1,
      filterProperty: 1,
      filterTitle: 2,
      multiselect: 1,
      multiselectInput: 1,
      multiselectOption: 1,
      multiselectItem: 1,
      buyoutPriceInputs: 2
    })
  })

  test("item popup and result row selectors match the fixture", async ({
    page
  }) => {
    await assertCounts(page, "common", {
      resultRowId: 8,
      resultRowAncestor: 3,
      modElement: 3,
      uniqueItemPopup: 0,
      compactResults: 0,
      itemPopup: 2,
      itemPopupHeaderLine: 2,
      itemPopupContent: 2,
      uniqueItemHeader: 2,
      itemTitleLine: 2,
      sellerName: 2,
      pinnedItemDetails: 2,
      itemRendered: 0
    })
  })

  test("pricing and modifier selectors match the fixture", async ({ page }) => {
    await assertCounts(page, "common", {
      itemPrice: 4,
      itemPriceIcon: 0,
      priceInfo: 4,
      priceCurrency: 4,
      modStatField: 3,
      qualityDataField: 0,
      itemLevelDataField: 0,
      flagsSeparator: 0,
      explicitSeparator: 1,
      itemLevelField: 0,
      itemIcon: 1,
      socket: 0,
      modValueSpan: 3
    })
  })

  test("PoE2-only copy button selectors match the fixture", async ({ page }) => {
    await assertCounts(page, "poe2", {
      copyButton: 3,
      poe2CopyButton: 1
    })
  })

  test("PoE1-only mod classes stay absent on PoE2", async ({ page }) => {
    await assertCounts(page, "poe1", {
      modImplicitClass: 1,
      modExplicitClass: 2,
      modMutatedClass: 0,
      modFracturedClass: 0,
      mutatedModContainer: 2,
      implicitMod: 1,
      fracturedMod: 0,
      explicitMods: 2,
      explicitModsWithDesecrated: 2
    })
  })
})
