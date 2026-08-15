import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

const common = await import("../lib/site-adapter/selectors/common.ts")
const poe1 = await import("../lib/site-adapter/selectors/poe1.ts")
const poe2 = await import("../lib/site-adapter/selectors/poe2.ts")

const json = JSON.parse(
  readFileSync(new URL("../tests/fixtures/trade-selectors.json", import.meta.url), "utf8")
)

const entriesOf = (module) =>
  Object.entries(module).filter(([key]) => key !== "default")

test("trade-selectors.json mirrors the typed selector modules", () => {
  for (const [group, module] of [
    ["common", common],
    ["poe1", poe1],
    ["poe2", poe2]
  ]) {
    assert.deepEqual(
      json[group],
      Object.fromEntries(entriesOf(module)),
      `${group} selectors drifted from the fixture JSON`
    )
  }
})

test("selector values are non-empty strings or string arrays", () => {
  for (const [group, selectors] of Object.entries(json)) {
    for (const [name, value] of Object.entries(selectors)) {
      if (Array.isArray(value)) {
        assert.ok(value.length > 0, `${group}.${name} is an empty array`)
        assert.ok(
          value.every((item) => typeof item === "string"),
          `${group}.${name} is not an array of strings`
        )
      } else {
        assert.equal(typeof value, "string", `${group}.${name} is not a string`)
        assert.ok(value.length > 0, `${group}.${name} is empty`)
      }
    }
  }
})

test("every migrated selector is present in the fixture snapshot", () => {
  const expectedCommon = [
    "itemPopup",
    "itemPopupContent",
    "itemPopupHeaderLine",
    "modElement",
    "uniqueItemHeader",
    "itemTitleLine",
    "itemTitleCandidates",
    "pinnedItemDetails",
    "itemPrice",
    "itemPriceIcon",
    "priceInfo",
    "priceCurrency",
    "buyoutPriceInputs",
    "modStatField",
    "qualityDataField",
    "itemLevelDataField",
    "flagsSeparator",
    "explicitSeparator",
    "searchButton",
    "resultRowId",
    "resultRowAncestor",
    "sellerName",
    "itemDetails"
  ]
  for (const name of expectedCommon) {
    assert.ok(name in json.common, `missing common selector: ${name}`)
  }

  const expectedPoe1 = [
    "containerModItems",
    "explicitMods",
    "explicitModsWithDesecrated",
    "implicitMod",
    "fracturedMod",
    "modImplicitClass",
    "modExplicitClass",
    "modMutatedClass",
    "modFracturedClass",
    "modCraftedClass",
    "modDesecratedClass",
    "mutatedModContainer"
  ]
  for (const name of expectedPoe1) {
    assert.ok(name in json.poe1, `missing poe1 selector: ${name}`)
  }

  assert.ok("copyButton" in json.poe2, "missing poe2 selector: copyButton")
  assert.ok("poe2CopyButton" in json.poe2, "missing poe2 selector: poe2CopyButton")
})
