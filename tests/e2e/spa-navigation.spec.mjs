// End-to-end: SPA navigation keeps Finer Filters and the trade-context
// reactive signal alive across pushState, back, and forward. The mock app
// survives the URL changes because the extension reloads its listeners via
// the tradeDomObserver singleton.

import { readFileSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { chromium, expect, test } from "@playwright/test"

const extensionPath = resolve("build-e2e/chrome-mv3")

const poe2Fixture = readFileSync(
  new URL("../fixtures/poe2/trade-search.html", import.meta.url),
  "utf8"
)

const installMockApp = () => {
  window.__calls = []
  const record = (method, details = {}) =>
    window.__calls.push({ method, ...details })

  const makeGroup = (index, type, filters = []) => {
    const group = {
      index,
      type,
      group: { type },
      $vnode: { tag: "stat-filter-group-item" },
      filters,
      state: { filters: filters.map(() => ({ value: {} })) },
      selectFilter(filter) {
        record(`${type}${index}.selectFilter`, { id: filter.id })
        if (filter && typeof filter === "object") {
          group.filters.push(filter)
          group.state.filters.push({ value: {} })
        }
      }
    }
    return group
  }

  const groups = [
    makeGroup(0, "and"),
    makeGroup(1, "and"),
    makeGroup(0, "not")
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

const launch = async () => {
  const profile = await mkdtemp(join(tmpdir(), "poe-trade-plus-spa-e2e-"))
  const context = await chromium.launchPersistentContext(profile, {
    headless: false,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  })
  await context.route("https://www.pathofexile.com/trade2/**", (route) =>
    route.fulfill({ contentType: "text/html", body: poe2Fixture })
  )
  return { context, profile }
}

const openPage = async (context) => {
  const page = await context.newPage()
  await page.addInitScript(installMockApp)
  await page.goto("https://www.pathofexile.com/trade2/search/Standard")
  await page.waitForTimeout(500)
  return page
}

const hoverFirstRow = (page) =>
  page.evaluate(() => {
    document
      .querySelector('.resultset > .result-item[data-id="row1"]')
      .dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true, cancelable: true })
      )
  })

const calls = (page) => page.evaluate(() => window.__calls)

test("Finer Filters survive search A → search B → back → forward", async () => {
  const { context, profile } = await launch()
  try {
    await findExtensionId(context)
    const page = await openPage(context)

    // 1. Search A — verify Finer Filters works
    await hoverFirstRow(page)
    await expect(page.locator('[data-id="row1"] #btns-finer')).toHaveCount(2)
    await expect(page.locator('[data-id="mod1"].finer-filterable')).toHaveCount(
      1
    )

    // 2. Navigate to search B (different league) — pushState
    await page.evaluate(() => {
      window.history.pushState({}, "", "/trade2/search/Hardcore")
    })
    await page.waitForTimeout(500)

    await hoverFirstRow(page)
    await expect(page.locator('[data-id="row1"] #btns-finer')).toHaveCount(2)
    await expect(page.locator('[data-id="mod1"].finer-filterable')).toHaveCount(
      1
    )

    // 3. Back to search A
    await page.goBack()
    await page.waitForTimeout(500)

    await hoverFirstRow(page)
    await expect(page.locator('[data-id="row1"] #btns-finer')).toHaveCount(2)
    await expect(page.locator('[data-id="mod1"].finer-filterable')).toHaveCount(
      1
    )

    // 4. Forward to search B
    await page.goForward()
    await page.waitForTimeout(500)

    await hoverFirstRow(page)
    await expect(page.locator('[data-id="row1"] #btns-finer')).toHaveCount(2)
    await expect(page.locator('[data-id="mod1"].finer-filterable')).toHaveCount(
      1
    )
  } finally {
    await context?.close()
    await rm(profile, { recursive: true, force: true })
  }
})

test("adding a filter still reaches the Vue store after pushState", async () => {
  const { context, profile } = await launch()
  try {
    await findExtensionId(context)
    const page = await openPage(context)

    // Navigate to a different search URL
    await page.evaluate(() => {
      window.history.pushState({}, "", "/trade2/search/Hardcore")
    })
    await page.waitForTimeout(500)

    // Drive a + click and verify the call lands on the live group
    await hoverFirstRow(page)
    await page.evaluate(() => {
      document
        .querySelector('[data-id="mod2"] [data-action="add-filter"]')
        .click()
    })
    await expect
      .poll(() => calls(page))
      .toContainEqual(
        expect.objectContaining({
          method: "and1.selectFilter",
          id: "3372524247"
        })
      )
    await expect
      .poll(() => calls(page))
      .toContainEqual({ method: "app.save", reload: true })
  } finally {
    await context?.close()
    await rm(profile, { recursive: true, force: true })
  }
})
