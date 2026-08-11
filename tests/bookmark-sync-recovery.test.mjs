import assert from "node:assert/strict"
import test from "node:test"

const stores = {
  local: new Map(),
  sync: new Map()
}
const listeners = new Set()
let failSyncSet = null
let syncSetCalls = 0
let syncSetGate = null

const clone = (value) => structuredClone(value)

const createArea = (name) => ({
  async get(keys = null) {
    const store = stores[name]
    const selected =
      keys === null ? [...store.keys()] : Array.isArray(keys) ? keys : [keys]
    return Object.fromEntries(
      selected
        .filter((key) => store.has(key))
        .map((key) => [key, clone(store.get(key))])
    )
  },
  async set(values) {
    if (name === "sync" && failSyncSet?.(values)) {
      throw new Error("Injected sync write failure")
    }
    if (name === "sync") syncSetCalls++
    await syncSetGate?.(name, values)
    const changes = {}
    for (const [key, value] of Object.entries(values)) {
      const oldValue = stores[name].get(key)
      stores[name].set(key, clone(value))
      changes[key] = { oldValue: clone(oldValue), newValue: clone(value) }
    }
    for (const listener of listeners) listener(changes, name)
  },
  async remove(keys) {
    const changes = {}
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      if (!stores[name].has(key)) continue
      changes[key] = {
        oldValue: clone(stores[name].get(key)),
        newValue: undefined
      }
      stores[name].delete(key)
    }
    if (Object.keys(changes).length > 0) {
      for (const listener of listeners) listener(changes, name)
    }
  }
})

globalThis.chrome = {
  runtime: { id: "bookmark-sync-test" },
  storage: {
    local: createArea("local"),
    sync: createArea("sync"),
    onChanged: { addListener: (listener) => listeners.add(listener) }
  }
}

const { BookmarksService } = await import("../lib/services/bookmarks.ts")
const { storageService } = await import("../lib/services/storage.ts")

const sync = storageService
sync.enqueueSyncOperation = async (operation) => operation()
sync.syncBatchDelay = 0

const folder = (id, title = id) => ({
  id,
  version: "1",
  icon: null,
  title,
  archivedAt: null,
  categories: []
})

const trade = (id, title = id) => ({
  id,
  title,
  completedAt: null,
  archivedAt: null,
  categoryId: null,
  location: { version: "1", type: "search", slug: id, league: null }
})

const reset = () => {
  if (sync.syncBatchTimer) clearTimeout(sync.syncBatchTimer)
  stores.local.clear()
  stores.sync.clear()
  failSyncSet = null
  syncSetCalls = 0
  syncSetGate = null
  sync.syncBatchDelay = 0
  sync.syncBatchTimer = null
  sync.pendingSyncMutations = []
  sync.syncOperationQueue = Promise.resolve()
  sync.syncRecoveryTimer = null
  sync.syncRecoveryInitialized = false
}

const seedPreviousFolders = async () => {
  await storageService.setValue(
    "bookmark-folders-chunk--previous-0",
    [folder("previous")],
    null,
    "sync"
  )
  await storageService.setValue(
    "bookmark-folders-manifest",
    { version: 1, chunkKeys: ["bookmark-folders-chunk--previous-0"] },
    null,
    "sync"
  )
}

test("keeps the previous manifest readable when a staged chunk batch fails", async () => {
  reset()
  await seedPreviousFolders()
  const bookmarks = new BookmarksService()
  failSyncSet = (values) => Object.keys(values).some((key) =>
    key.startsWith("bookmark-folders-chunk--")
  )

  await assert.rejects(
    bookmarks.persistFoldersToChunks([
      folder("one", "a".repeat(3600)),
      folder("two", "b".repeat(3600))
    ])
  )

  assert.deepEqual(
    (await bookmarks.fetchFolders()).map(({ id }) => id),
    ["previous"]
  )
})

test("batches concurrent Sync writes into one storage call", async () => {
  reset()

  await Promise.all([
    storageService.setValue("batch-one", { value: 1 }, null, "sync"),
    storageService.setValue("batch-two", { value: 2 }, null, "sync")
  ])

  assert.equal(syncSetCalls, 1)
})

test("waits for a quiet Sync window before publishing batched changes", async () => {
  reset()
  sync.syncBatchDelay = 100

  const first = storageService.setValue("batch-one", { value: 1 }, null, "sync")
  await new Promise((resolve) => setTimeout(resolve, 15))
  const second = storageService.setValue("batch-two", { value: 2 }, null, "sync")
  await new Promise((resolve) => setTimeout(resolve, 30))

  assert.equal(syncSetCalls, 0)
  await Promise.all([first, second])
  assert.equal(syncSetCalls, 1)
})

test("can enqueue Sync changes without waiting for the batch to publish", async () => {
  reset()
  sync.syncBatchDelay = 30

  const queued = await storageService.setValue(
    "deferred",
    { value: true },
    null,
    "sync",
    { awaitSync: false }
  )

  assert.equal(queued, true)
  assert.equal(syncSetCalls, 0)
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(syncSetCalls, 1)
})

test("rehydrates a pending local bookmark journal before Sync is flushed", async () => {
  reset()
  const previousSendMessage = chrome.runtime.sendMessage
  chrome.runtime.sendMessage = async () => ({ ok: true })
  try {
    const writer = new BookmarksService()
    await writer.persistTrades([trade("pending")], "journal-folder")

    assert.deepEqual(
      await storageService.getValue("bookmark-trades-manifest--journal-folder", null, "sync"),
      null
    )

    const reloaded = new BookmarksService()
    assert.deepEqual(
      (await reloaded.fetchTradesByFolderId("journal-folder", { force: true })).map(
        ({ id }) => id
      ),
      ["pending"]
    )

    await reloaded.flushPendingOperations()
    assert.deepEqual(
      (await new BookmarksService().fetchTradesByFolderId("journal-folder", {
        force: true
      })).map(({ id }) => id),
      ["pending"]
    )
  } finally {
    chrome.runtime.sendMessage = previousSendMessage
  }
})

test("does not publish staged chunks when manifest publication fails", async () => {
  reset()
  await seedPreviousFolders()
  const bookmarks = new BookmarksService()
  failSyncSet = (values) => "bookmark-folders-manifest" in values

  await assert.rejects(
    bookmarks.persistFoldersToChunks([folder("replacement")])
  )

  assert.deepEqual(
    (await bookmarks.fetchFolders()).map(({ id }) => id),
    ["previous"]
  )
  assert.ok(
    [...stores.sync.keys()].some(
      (key) =>
        key.startsWith("bookmark-folders-chunk--") &&
        !key.endsWith("previous-0")
    )
  )
})

test("falls back to the legacy folders key when a manifest references a missing chunk", async () => {
  reset()
  await storageService.setValue(
    "bookmark-folders-manifest",
    { version: 1, chunkKeys: ["bookmark-folders-chunk--missing-0"] },
    null,
    "sync"
  )
  await storageService.setValue(
    "bookmark-folders",
    [folder("legacy")],
    null,
    "sync"
  )
  const bookmarks = new BookmarksService()

  assert.deepEqual(
    (await bookmarks.fetchFolders()).map(({ id }) => id),
    ["legacy"]
  )
  assert.deepEqual(
    (await storageService.getValue("bookmark-folders-manifest", null, "sync"))
      .chunkKeys.length,
    1
  )
})

test("restores managed Sync data from the local recovery snapshot when Sync becomes empty", async () => {
  reset()
  await storageService.setValue(
    "bookmark-folders",
    [folder("saved")],
    null,
    "sync"
  )
  await sync.snapshotManagedSyncData()
  stores.sync.clear()

  await sync.recoverOrSnapshotManagedSyncData()

  assert.deepEqual(
    (await storageService.getValue("bookmark-folders", null, "sync")).map(
      ({ id }) => id
    ),
    ["saved"]
  )
})

test("keeps independent folder changes from two devices during concurrent add, delete, and edit operations", async () => {
  reset()
  const seed = new BookmarksService()
  await seed.persistTrades([trade("existing-add")], "folder-add")
  await seed.persistTrades([trade("remove-me")], "folder-remove")
  await seed.persistTrades([trade("edit-me", "before")], "folder-edit")

  const deviceA = new BookmarksService()
  const deviceB = new BookmarksService()
  await Promise.all([
    deviceA.persistTrades(
      [trade("existing-add"), trade("added-by-a")],
      "folder-add"
    ),
    deviceB.persistTrades([], "folder-remove"),
    deviceB.persistTrades([trade("edit-me", "after")], "folder-edit")
  ])

  const reader = new BookmarksService()
  assert.deepEqual(
    (await reader.fetchTradesByFolderId("folder-add")).map(({ id }) => id),
    ["existing-add", "added-by-a"]
  )
  assert.deepEqual(await reader.fetchTradesByFolderId("folder-remove"), [])
  assert.equal(
    (await reader.fetchTradesByFolderId("folder-edit"))[0].title,
    "after"
  )
})


test("keeps a local journal entry when a trade flush fails so it can retry", async () => {
  reset()
  const bookmarks = new BookmarksService()
  failSyncSet = (values) =>
    Object.keys(values).some((key) => key.startsWith("bookmark-trades-chunk--failure-"))

  await assert.rejects(bookmarks.persistTrades([trade("will-fail")], "failure"))

  failSyncSet = null
  assert.deepEqual(
    (await bookmarks.fetchTradesByFolderId("failure", { force: true })).map(
      ({ id }) => id
    ),
    ["will-fail"]
  )
  await bookmarks.flushPendingOperations()
  assert.deepEqual(
    (await new BookmarksService().fetchTradesByFolderId("failure", {
      force: true
    })).map(({ id }) => id),
    ["will-fail"]
  )
})

test("creates new bookmarks without inheriting a category", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistFolders([
    { ...folder("created"), categories: [{ id: "category", title: "Category" }] }
  ])

  const { id: _ignoredId, ...newTrade } = {
    ...trade("temporary"),
    categoryId: "category"
  }
  const id = await bookmarks.persistTrade(newTrade, "created")

  assert.equal(
    (await bookmarks.fetchTradesByFolderId("created", { force: true }))
      .find((entry) => entry.id === id)
      .categoryId,
    null
  )
})

test("deduplicates repeated bookmark ids before publishing a folder", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistTrades([trade("same"), trade("same")], "dedupe")

  assert.deepEqual(
    (await bookmarks.fetchTradesByFolderId("dedupe", { force: true })).map(({ id }) => id),
    ["same"]
  )
})

test("moveTradeBetweenFolders carries a missing category into its target", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistFolders([
    { ...folder("source"), categories: [{ id: "source-category", title: "Source" }] },
    { ...folder("target"), categories: [{ id: "other-category", title: "Other" }] }
  ])
  await bookmarks.persistTrades([{ ...trade("moved"), categoryId: "source-category" }], "source")
  await bookmarks.persistTrades([], "target")

  await bookmarks.moveTradeBetweenFolders("moved", "source", "target")

  assert.deepEqual(await bookmarks.fetchTradesByFolderId("source", { force: true }), [])
  assert.equal(
    (await bookmarks.fetchTradesByFolderId("target", { force: true }))[0].categoryId,
    "source-category"
  )
  assert.deepEqual(
    (await bookmarks.fetchFolders())
      .find(({ id }) => id === "target")
      .categories.map(({ id }) => id),
    ["other-category", "source-category"]
  )
})

test("moveCategory uses the requested final visual index", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistFolders([{
    ...folder("categories"),
    categories: [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
      { id: "c", title: "C" }
    ]
  }])

  await bookmarks.moveCategory("categories", 0, 2)

  assert.deepEqual(
    (await bookmarks.fetchFolders())[0].categories.map(({ id }) => id),
    ["b", "c", "a"]
  )
})

test("keeps source bookmarks durable while a category transfer is still publishing its target", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistFolders([
    { ...folder("source"), categories: [{ id: "moved-category", title: "Moved" }] },
    folder("target")
  ])
  await bookmarks.persistTrades(
    [{ ...trade("moved"), categoryId: "moved-category" }],
    "source"
  )
  await bookmarks.persistTrades([], "target")

  let entered
  let release
  const enteredGate = new Promise((resolve) => { entered = resolve })
  const releaseGate = new Promise((resolve) => { release = resolve })
  let blocked = false
  syncSetGate = (_name, values) => {
    if (!blocked && "bookmark-trades-manifest--target" in values) {
      blocked = true
      entered()
      return releaseGate
    }
  }

  const transfer = bookmarks.moveCategoryBetweenFolders(
    "moved-category",
    "source",
    "target"
  )
  await enteredGate

  const reloaded = new BookmarksService()
  assert.deepEqual(
    (await reloaded.fetchTradesByFolderId("source", { force: true })).map(({ id }) => id),
    ["moved"]
  )

  release()
  await transfer

  const completed = new BookmarksService()
  assert.deepEqual(
    await completed.fetchTradesByFolderId("source", { force: true }),
    []
  )
  assert.deepEqual(
    (await completed.fetchTradesByFolderId("target", { force: true })).map(({ id }) => id),
    ["moved"]
  )
})


test("moves the only source trade into an empty target folder", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistFolders([folder("source"), folder("target")])
  await bookmarks.persistTrades([trade("only")], "source")
  await bookmarks.persistTrades([], "target")

  await bookmarks.moveTradeBetweenFolders("only", "source", "target")

  assert.deepEqual(await bookmarks.fetchTradesByFolderId("source", { force: true }), [])
  assert.deepEqual(
    (await bookmarks.fetchTradesByFolderId("target", { force: true })).map(({ id }) => id),
    ["only"]
  )
})

test("retains a category when the exact destination category exists", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistFolders([
    { ...folder("source"), categories: [{ id: "shared", title: "Shared" }] },
    { ...folder("target"), categories: [{ id: "shared", title: "Shared" }] }
  ])
  await bookmarks.persistTrades([{ ...trade("categorized"), categoryId: "shared" }], "source")
  await bookmarks.persistTrades([], "target")

  await bookmarks.moveTradeBetweenFolders("categorized", "source", "target")

  assert.equal(
    (await bookmarks.fetchTradesByFolderId("target", { force: true }))[0].categoryId,
    "shared"
  )
})

test("rejects invalid cross-folder moves without changing either folder", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistFolders([folder("source"), folder("target")])
  await bookmarks.persistTrades([trade("present")], "source")
  await bookmarks.persistTrades([], "target")

  await assert.rejects(bookmarks.moveTradeBetweenFolders("missing", "source", "target"))
  await assert.rejects(bookmarks.moveTradeBetweenFolders("present", "source", "source"))
  await assert.rejects(bookmarks.moveTradeBetweenFolders("present", "source", "target", -1))
  await bookmarks.moveTradeBetweenFolders("present", "source", "target", 999)

  assert.deepEqual(await bookmarks.fetchTradesByFolderId("source", { force: true }), [])
  assert.deepEqual(
    (await bookmarks.fetchTradesByFolderId("target", { force: true })).map(({ id }) => id),
    ["present"]
  )
})

test("rolls back a cross-folder move when the target write fails", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistFolders([folder("source"), folder("target")])
  await bookmarks.persistTrades([trade("moved")], "source")
  await bookmarks.persistTrades([], "target")
  let targetFailure = true
  failSyncSet = (values) =>
    targetFailure && Object.keys(values).some((key) => key.startsWith("bookmark-trades-chunk--target"))
      ? !(targetFailure = false)
      : false

  await assert.rejects(bookmarks.moveTradeBetweenFolders("moved", "source", "target"))

  const reloaded = new BookmarksService()
  assert.deepEqual(
    (await reloaded.fetchTradesByFolderId("source", { force: true })).map(({ id }) => id),
    ["moved"]
  )
  assert.deepEqual(await reloaded.fetchTradesByFolderId("target", { force: true }), [])
})

test("queued trade persistence cannot recreate chunks after deleting its folder", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistFolders([folder("queued")])
  let entered
  let release
  const enteredGate = new Promise((resolve) => { entered = resolve })
  const releaseGate = new Promise((resolve) => { release = resolve })
  let blocked = false
  syncSetGate = (_name, values) => {
    if (!blocked && Object.keys(values).some((key) => key.startsWith("bookmark-trades-chunk--queued"))) {
      blocked = true
      entered()
      return releaseGate
    }
  }

  const write = bookmarks.persistTrades([trade("queued-trade")], "queued")
  await enteredGate
  const deletion = bookmarks.deleteFolder("queued")
  release()
  await write
  await deletion

  assert.ok(
    ![...stores.sync.keys()].some((key) =>
      key.startsWith("bookmark-trades-manifest--queued") || key.startsWith("bookmark-trades-chunk--queued")
    )
  )
})

test("removes a folder from the visible store before its Sync cleanup completes", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistFolders([folder("optimistic")])
  await bookmarks.persistTrades([trade("optimistic-trade")], "optimistic")
  await bookmarks.refresh()

  let visibleFolders = []
  const snapshots = []
  const unsubscribe = bookmarks.subscribe((folders) => {
    visibleFolders = folders
    snapshots.push(folders.map(({ id }) => id))
  })
  const deletion = bookmarks.deleteFolder("optimistic")
  const snapshotCount = snapshots.length

  assert.deepEqual(visibleFolders, [])
  await deletion
  unsubscribe()

  assert.ok(
    snapshots.slice(snapshotCount).every((ids) => !ids.includes("optimistic"))
  )
  assert.deepEqual(await bookmarks.fetchFolders(), [])
})

test("restores the visible folder when its Sync deletion fails", async () => {
  reset()
  const bookmarks = new BookmarksService()
  await bookmarks.persistFolders([folder("rollback")])
  await bookmarks.persistTrades([trade("rollback-trade")], "rollback")
  await bookmarks.refresh()

  let visibleFolders = []
  const unsubscribe = bookmarks.subscribe((folders) => {
    visibleFolders = folders
  })
  failSyncSet = (values) => "bookmark-folders-manifest" in values

  await bookmarks.deleteFolder("rollback")
  failSyncSet = null
  unsubscribe()

  assert.deepEqual(visibleFolders.map(({ id }) => id), ["rollback"])
  assert.deepEqual(
    (await bookmarks.fetchFolders()).map(({ id }) => id),
    ["rollback"]
  )
})

test("serializes rapid repeated persistence and remains usable after a failed write", async () => {
  reset()
  const bookmarks = new BookmarksService()
  failSyncSet = (values) => Object.keys(values).some((key) => key.startsWith("bookmark-trades-chunk--rapid"))
  await assert.rejects(bookmarks.persistTrades([trade("failed")], "rapid"))
  failSyncSet = null

  await Promise.all([
    bookmarks.persistTrades([trade("first")], "rapid"),
    bookmarks.persistTrades([trade("second")], "rapid")
  ])

  const reloaded = new BookmarksService()
  assert.deepEqual(
    (await reloaded.fetchTradesByFolderId("rapid", { force: true })).map(({ id }) => id),
    ["second"]
  )
})
