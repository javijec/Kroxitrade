// End-to-end: the built extension's Finer Filters work on PoE2 Trade pages.
// The PoE2 site shares the same Vue filter backend as PoE1, but renders
// different row/mod markup, so a PoE2-only break must fail CI on its own.
//
// The mock app is stateful: selectFilter/updateFilter/removeFilter mutate the
// group's filters and state so the +/- state machine (add -> bump -> lower ->
// remove) is exercised exactly as the extension drives it.

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

const installMockApp = (initialAnd0 = []) => {
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
      },
      updateFilter(i, value) {
        record(`${type}${index}.updateFilter`, { index: i, value })
        group.state.filters[i].value = {
          ...group.state.filters[i].value,
          ...value
        }
      },
      removeFilter(i) {
        record(`${type}${index}.removeFilter`, { index: i })
        group.filters.splice(i, 1)
        group.state.filters.splice(i, 1)
      }
    }
    return group
  }

  const groups = [
    makeGroup(0, "and", initialAnd0),
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
  const profile = await mkdtemp(join(tmpdir(), "poe-trade-plus-poe2-e2e-"))
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

const openPage = async (context, initialAnd0 = []) => {
  const page = await context.newPage()
  await page.addInitScript(installMockApp, initialAnd0)
  await page.goto("https://www.pathofexile.com/trade2/search")
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

const postGlobalAction = (page, action, types, prefix) =>
  page.evaluate(
    (payload) => {
      window.postMessage(
        {
          source: "poe-trade-plus:bus",
          channel: "finer-filters:action",
          payload
        },
        "*"
      )
    },
    { action, types, prefix }
  )

test("PoE2 Finer Filters decorates mods and adds/removes filters through the adapter", async () => {
  const { context, profile } = await launch()
  try {
    await findExtensionId(context)
    const page = await openPage(context)
    await hoverFirstRow(page)

    await expect(page.locator('[data-id="row1"] #btns-finer')).toHaveCount(2)
    await expect(page.locator('[data-id="mod1"].finer-filterable')).toHaveCount(
      1
    )
    await expect(page.locator('[data-id="mod2"].finer-filterable')).toHaveCount(
      1
    )

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
      .toContainEqual({
        method: "app.save",
        reload: true
      })
    await expect
      .poll(() => calls(page))
      .toContainEqual({
        method: "panel.search"
      })

    await page.evaluate(() => {
      document
        .querySelector('[data-id="mod1"] [data-action="rmv-filter"]')
        .click()
    })
    await expect
      .poll(() => calls(page))
      .toContainEqual({
        method: "store.commit",
        mutation: "pushStatGroup",
        payload: {
          type: "not",
          filters: [expect.objectContaining({ id: "allAttributes" })]
        }
      })
  } finally {
    await context?.close()
    await rm(profile, { recursive: true, force: true })
  }
})

test("PoE2 global +/- drive the first AND group through the bus", async () => {
  const { context, profile } = await launch()
  try {
    await findExtensionId(context)
    const page = await openPage(context)

    await postGlobalAction(
      page,
      "global-plus",
      "explicit_fire",
      "explicit.stat_"
    )
    await expect
      .poll(() => calls(page))
      .toContainEqual(
        expect.objectContaining({
          method: "and0.selectFilter",
          id: "explicit.stat_3372524247"
        })
      )

    await postGlobalAction(
      page,
      "global-plus",
      "explicit_fire",
      "explicit.stat_"
    )
    await expect
      .poll(() => calls(page))
      .toContainEqual(
        expect.objectContaining({
          method: "and0.updateFilter",
          index: 0,
          value: { min: 10 }
        })
      )

    await postGlobalAction(
      page,
      "global-minus",
      "explicit_fire",
      "explicit.stat_"
    )
    await expect
      .poll(() => calls(page))
      .toContainEqual(
        expect.objectContaining({
          method: "and0.updateFilter",
          index: 0,
          value: { min: 0 }
        })
      )

    await postGlobalAction(
      page,
      "global-minus",
      "explicit_fire",
      "explicit.stat_"
    )
    await expect
      .poll(() => calls(page))
      .toContainEqual(
        expect.objectContaining({ method: "and0.removeFilter", index: 0 })
      )
  } finally {
    await context?.close()
    await rm(profile, { recursive: true, force: true })
  }
})

test("PoE2 Finer Filters decorates dynamically added result rows", async () => {
  const { context, profile } = await launch()
  try {
    await findExtensionId(context)
    const page = await openPage(context)

    await page.evaluate(() => {
      const row = document.createElement("div")
      row.className = "result-item"
      row.dataset.id = "rowX"
      row.innerHTML = `
        <div class="item-popup" data-id="itemX">
          <div class="item-popup__content">
            <div class="item-mod item-mod--explicit" data-id="modX1">
              <span class="lc s" data-field="stat.1509134228">+10% to Physical Damage</span>
              <span class="lc l">T1</span>
              <span class="lc r">10</span>
            </div>
            <div class="item-mod item-mod--explicit" data-id="modX2">
              <span class="lc s" data-field="stat.2974417149">+20% to Spell Damage</span>
              <span class="lc l">T2</span>
              <span class="lc r">20</span>
            </div>
          </div>
        </div>`
      document.querySelector(".resultset").appendChild(row)
    })

    await expect(page.locator('[data-id="rowX"] #btns-finer')).toHaveCount(2)
    await expect(
      page.locator('[data-id="modX1"].finer-filterable')
    ).toHaveCount(1)
    await expect(
      page.locator('[data-id="modX2"].finer-filterable')
    ).toHaveCount(1)
  } finally {
    await context?.close()
    await rm(profile, { recursive: true, force: true })
  }
})

test("PoE2 already-active filters stay marked and the layout toggle re-scans", async () => {
  const { context, profile } = await launch()
  try {
    await findExtensionId(context)
    const page = await openPage(context, [
      { id: "3372524247", value: {}, disabled: false }
    ])
    await hoverFirstRow(page)

    await expect(page.locator('[data-id="mod2"].finer-filtered')).toHaveCount(1)
    await expect(
      page.locator('[data-id="mod2"] .finer-filtered-overlay')
    ).toHaveCount(1)
    await expect(page.locator('[data-id="mod1"].finer-filterable')).toHaveCount(
      1
    )

    await page.evaluate(() => {
      const button = document.createElement("button")
      button.className = "layout-btn"
      document.body.appendChild(button)
      button.click()
    })

    await expect(page.locator('[data-id="row1"] #btns-finer')).toHaveCount(2)
    await expect(page.locator('[data-id="mod2"].finer-filtered')).toHaveCount(1)
  } finally {
    await context?.close()
    await rm(profile, { recursive: true, force: true })
  }
})
