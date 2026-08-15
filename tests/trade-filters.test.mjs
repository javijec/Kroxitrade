// The tradeFilters adapter is the only public surface of the Vue-backed
// filter backend. Tests assert the adapter's behaviour end-to-end so the
// internal Vue helpers in site-adapter/trade-filters.ts stay unexported.

import assert from "node:assert/strict"
import test from "node:test"

const { tradeFilters } = await import("../lib/site-adapter/trade-filters.ts")

const buildApp = () => {
  const calls = []
  const record = (method, details = {}) => calls.push({ method, ...details })

  const groups = [
    {
      index: 0,
      type: "and",
      group: { type: "and" },
      $vnode: { tag: "stat-filter-group-item" },
      filters: [{ id: "life", value: {}, disabled: false }],
      state: { filters: [{ value: { min: 0 } }] },
      selectFilter: (filter) => record("and0.selectFilter", { id: filter.id }),
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

  const app = {
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

  return { app, groups, resultPanel, calls }
}

const setWindow = (value) => {
  globalThis.window = value
}

test("tradeFilters.isAvailable mirrors window.app presence", () => {
  setWindow({})
  assert.equal(tradeFilters.isAvailable(), false)
  setWindow({ app: {} })
  assert.equal(tradeFilters.isAvailable(), true)
  setWindow({})
})

test("tradeFilters.getFilters maps Vue groups into feature-facing views", () => {
  const { app } = buildApp()
  setWindow({ app })

  const views = tradeFilters.getFilters("and")
  assert.equal(views.length, 2)
  assert.deepEqual(views[0], {
    index: 0,
    type: "and",
    filters: [{ id: "life", value: { min: 0 } }]
  })
  assert.deepEqual(views[1], { index: 1, type: "and", filters: [] })
  setWindow({})
})

test("tradeFilters.getFilters only returns the requested type", () => {
  const { app } = buildApp()
  setWindow({ app })

  assert.equal(tradeFilters.getFilters("and").length, 2)
  assert.equal(tradeFilters.getFilters("not").length, 1)
  assert.equal(tradeFilters.getFilters("and")[0].type, "and")
  assert.equal(tradeFilters.getFilters("not")[0].type, "not")
  setWindow({})
})

test("tradeFilters.getFilters returns empty arrays without window.app", () => {
  setWindow({})
  assert.deepEqual(tradeFilters.getFilters(), [])
  assert.deepEqual(tradeFilters.getFilters("and"), [])
})

test("tradeFilters.addFilter targets the first non-zero group by default", () => {
  const { app, calls } = buildApp()
  setWindow({ app })

  tradeFilters.addFilter("total_fire_resistance", "and")
  assert.deepEqual(calls.at(-1), {
    method: "and1.selectFilter",
    id: "total_fire_resistance"
  })
  setWindow({})
})

test("tradeFilters.addFilter can target an explicit group", () => {
  const { app, calls } = buildApp()
  setWindow({ app })

  const and0 = tradeFilters.getFilters("and").find((group) => group.index === 0)
  tradeFilters.addFilter("total_fire_resistance", "and", and0)
  assert.deepEqual(calls.at(-1), {
    method: "and0.selectFilter",
    id: "total_fire_resistance"
  })
  setWindow({})
})

test("tradeFilters.addFilter falls back to the store commit when no group is available", () => {
  const { app, calls } = buildApp()
  setWindow({ app })
  app.$children[0].$children[0].$children = []

  tradeFilters.addFilter("total_fire_resistance", "and")
  assert.deepEqual(calls.at(-1), {
    method: "store.commit",
    mutation: "pushStatGroup",
    payload: {
      type: "and",
      filters: [{ id: "total_fire_resistance", value: {}, disabled: false }]
    }
  })
  setWindow({})
})

test("tradeFilters.updateFilter and removeFilter act on the live group", () => {
  const { app, calls } = buildApp()
  setWindow({ app })

  const and0 = tradeFilters.getFilters("and").find((group) => group.index === 0)
  tradeFilters.updateFilter(and0, 0, { min: 10 })
  assert.deepEqual(calls.at(-1), {
    method: "and0.updateFilter",
    index: 0,
    value: { min: 10 }
  })

  tradeFilters.removeFilter(and0, 0)
  assert.deepEqual(calls.at(-1), { method: "and0.removeFilter", index: 0 })
  setWindow({})
})

test("tradeFilters.updateFilter and removeFilter are safe without a live group", () => {
  setWindow({})
  assert.equal(
    tradeFilters.updateFilter({ index: 0, type: "and", filters: [] }, 0, {
      min: 1
    }),
    false
  )
  assert.equal(
    tradeFilters.removeFilter({ index: 0, type: "and", filters: [] }, 0),
    false
  )
})

test("tradeFilters.save and refresh delegate to the site backend", () => {
  const { app, calls } = buildApp()
  setWindow({ app })

  tradeFilters.save()
  tradeFilters.refresh()

  assert.deepEqual(calls.at(-2), { method: "app.save", reload: true })
  assert.deepEqual(calls.at(-1), { method: "panel.search" })
  setWindow({})
})

test("tradeFilters.save and refresh are safe without window.app", () => {
  setWindow({})
  assert.doesNotThrow(() => tradeFilters.save())
  assert.doesNotThrow(() => tradeFilters.refresh())
})

test("tradeFilters.addFilter is safe without a store commit handler", () => {
  setWindow({ app: { $store: {} } })
  assert.doesNotThrow(() => tradeFilters.addFilter("life", "and"))
})
