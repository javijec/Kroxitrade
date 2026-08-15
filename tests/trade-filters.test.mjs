import assert from "node:assert/strict"
import test from "node:test"

const {
  createFilter,
  getItemResultPanel,
  getStatFilterGroups,
  hasTradeVueApp,
  pushStatGroup,
  refreshResults,
  saveSearch,
  tradeFilters
} = await import("../lib/site-adapter/trade-filters.ts")

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

test("hasTradeVueApp reflects window.app presence", () => {
  setWindow({})
  assert.equal(hasTradeVueApp(), false)
  setWindow({ app: {} })
  assert.equal(hasTradeVueApp(), true)
})

test("getStatFilterGroups traverses the Vue tree and filters by type", () => {
  const { app, groups } = buildApp()
  setWindow({ app })

  assert.deepEqual(getStatFilterGroups(), groups)
  assert.deepEqual(getStatFilterGroups("and"), [groups[0], groups[1]])
  assert.deepEqual(getStatFilterGroups("not"), [groups[2]])
})

test("getStatFilterGroups returns an empty list without window.app", () => {
  setWindow({})
  assert.deepEqual(getStatFilterGroups(), [])
  assert.deepEqual(getStatFilterGroups("and"), [])
})

test("getItemResultPanel finds the results panel with its search method", () => {
  const { app, resultPanel } = buildApp()
  setWindow({ app })
  assert.equal(getItemResultPanel(), resultPanel)
})

test("getItemResultPanel returns undefined without window.app", () => {
  setWindow({})
  assert.equal(getItemResultPanel(), undefined)
})

test("createFilter builds a disabled-less stat filter and stays falsy for empty ids", () => {
  assert.deepEqual(createFilter("total_life"), {
    id: "total_life",
    value: {},
    disabled: false
  })
  assert.equal(createFilter(""), "")
})

test("pushStatGroup commits through the Vue store", () => {
  const { app, calls } = buildApp()
  setWindow({ app })

  const filter = createFilter("total_fire_resistance")
  pushStatGroup("not", [filter])

  assert.deepEqual(calls.at(-1), {
    method: "store.commit",
    mutation: "pushStatGroup",
    payload: { type: "not", filters: [filter] }
  })
})

test("pushStatGroup is a no-op without a store commit handler", () => {
  setWindow({ app: { $store: {} } })
  assert.doesNotThrow(() => pushStatGroup("and", [createFilter("life")]))
})

test("saveSearch triggers the app save and refreshResults the results panel", () => {
  const { app, calls } = buildApp()
  setWindow({ app })

  saveSearch()
  refreshResults()

  assert.deepEqual(calls.at(-2), { method: "app.save", reload: true })
  assert.deepEqual(calls.at(-1), { method: "panel.search" })
})

test("saveSearch and refreshResults are safe without window.app", () => {
  setWindow({})
  assert.doesNotThrow(saveSearch)
  assert.doesNotThrow(refreshResults)
})

test("filter groups expose the mutation methods features rely on", () => {
  const { app, groups } = buildApp()
  setWindow({ app })

  const andGroup = getStatFilterGroups("and").find((group) => group.index === 0)
  assert.ok(andGroup?.selectFilter)
  assert.ok(andGroup?.updateFilter)
  assert.ok(andGroup?.removeFilter)
  assert.ok(andGroup?.filters.some((filter) => filter.id === "life"))
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
})

test("tradeFilters.isAvailable mirrors window.app presence", () => {
  setWindow({})
  assert.equal(tradeFilters.isAvailable(), false)
  setWindow({ app: {} })
  assert.equal(tradeFilters.isAvailable(), true)
})

test("tradeFilters.addFilter targets the first non-zero group by default", () => {
  const { app, calls } = buildApp()
  setWindow({ app })

  tradeFilters.addFilter("total_fire_resistance", "and")
  assert.deepEqual(calls.at(-1), {
    method: "and1.selectFilter",
    id: "total_fire_resistance"
  })
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
})

test("tradeFilters.addFilter falls back to pushStatGroup without a group", () => {
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
})
