// End-to-end: the built extension's Finer Filters decorate item mods with +/-
// buttons and mutate the Trade site's stat-filter groups through the typed
// adapter, without breaking when the app exposes a real Vue tree.

import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { readFileSync } from "node:fs"
import { chromium, expect, test } from "@playwright/test"

const extensionPath = resolve("build-e2e/chrome-mv3")

const poe1Fixture = readFileSync(
  new URL("../fixtures/poe1/trade-search.html", import.meta.url),
  "utf8"
)

const installMockApp = () => {
  window.__calls = []
  const record = (method, details = {}) =>
    window.__calls.push({ method, ...details })

  const groups = [
    {
      index: 0,
      type: "and",
      group: { type: "and" },
      $vnode: { tag: "stat-filter-group-item" },
      filters: [{ id: "life", value: {}, disabled: false }],
      state: { filters: [{ value: { min: 0 } }] },
      selectFilter: (filter) =>
        record("and0.selectFilter", { id: filter.id }),
      updateFilter: (index, value) =>
        record("and0.updateFilter", { index, value }),
      removeFilter: (index) => record("and0.removeFilter", { index })
    },
    {
      index: 1,
      type: "and",
      group: { type: "and" },
      $vnode: { tag: "stat-filter-group-item" },
      filters: [],
      selectFilter: (filter) => record("and1.selectFilter", { id: filter.id })
    },
    {
      index: 0,
      type: "not",
      group: { type: "not" },
      $vnode: { tag: "stat-filter-group-item" },
      filters: [],
      selectFilter: (filter) => record("not0.selectFilter", { id: filter.id })
    }
  ]

  const resultPanel = {
    $vnode: { tag: "item-results-panel-component" },
    $children: [],
    search: () => record("panel.search")
  }

  window.app = {
    save: (reload) => record("app.save", { reload }),
    $store: {
      commit: (mutation, payload) =>
        record("store.commit", { mutation, payload })
    },
    $vnode: { tag: "app-root" },
    $children: [
      {
        $vnode: { tag: "item-search-panel-component" },
        $children: [
          {
            $vnode: { tag: "item-filter-panel-component" },
            $children: groups
          }
        ]
      },
      resultPanel
    ]
  }
}

const findExtensionId = async (context) => {
  const extensionsPage = await context.newPage()
  await extensionsPage.goto("chrome://extensions/")
  await extensionsPage.waitForTimeout(1_000)
  const extensions = await extensionsPage
    .locator("extensions-manager")
    .evaluate((manager) => {
      const visit = (root) =>
        [...root.querySelectorAll("extensions-item")].map((item) => ({
          id: item.id,
          extensionId: item.getAttribute("id"),
          name: item.data?.name ?? item.name,
          state: item.data?.state
        }))
      const list = manager.shadowRoot?.querySelector("extensions-item-list")
      return list ? visit(list.shadowRoot ?? list) : []
    })
  await extensionsPage.close()
  const extension = extensions.find((item) => item.name === "Poe Trade Plus")
  if (!extension?.id || extension.state !== "ENABLED")
    throw new Error(
      `PoeTradePlus was not loaded by Chrome: ${JSON.stringify(extensions)}`
    )
  return extension.id
}

test("Finer Filters decorates mods and drives stat filters through the adapter", async () => {
  const profile = await mkdtemp(join(tmpdir(), "poe-trade-plus-finer-e2e-"))
  let context

  try {
    context = await chromium.launchPersistentContext(profile, {
      headless: false,
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    })
    await context.route("https://www.pathofexile.com/trade/**", (route) =>
      route.fulfill({ contentType: "text/html", body: poe1Fixture })
    )

    const extensionId = await findExtensionId(context)
    const page = await context.newPage()
    await page.addInitScript(installMockApp)
    await page.goto("https://www.pathofexile.com/trade/search")
    await page.waitForTimeout(500)

    await page.evaluate(() => {
      const row = document.querySelector(".resultset > .row")
      row.dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true, cancelable: true })
      )
    })

    await expect(page.locator('[data-id="row1"] #btns-finer')).toHaveCount(3)

    await expect(page.locator('[data-id="mod1"].finer-filtered')).toHaveCount(1)
    await expect(
      page.locator('[data-id="mod1"] .finer-filtered-overlay')
    ).toHaveCount(1)
    await expect(page.locator('[data-id="mod2"].finer-filterable')).toHaveCount(1)

    await page.evaluate(() => {
      document
        .querySelector('[data-id="mod1"] [data-action="add-filter"]')
        .click()
    })

    await expect
      .poll(() => page.evaluate(() => window.__calls))
      .toContainEqual(
        expect.objectContaining({
          method: "and1.selectFilter",
          id: "life"
        })
      )
    await expect
      .poll(() => page.evaluate(() => window.__calls))
      .toContainEqual({ method: "app.save", reload: true })
    await expect
      .poll(() => page.evaluate(() => window.__calls))
      .toContainEqual({ method: "panel.search" })

    await page.evaluate(() => {
      window.postMessage(
        {
          source: "poe-trade-plus:bus",
          channel: "finer-filters:action",
          payload: {
            action: "global-plus",
            types: "life",
            prefix: "pseudo.pseudo_"
          }
        },
        "*"
      )
    })

    await expect
      .poll(() => page.evaluate(() => window.__calls))
      .toContainEqual(
        expect.objectContaining({
          method: "and0.selectFilter",
          id: "pseudo.pseudo_total_life"
        })
      )
  } finally {
    await context?.close()
    await rm(profile, { recursive: true, force: true })
  }
})
