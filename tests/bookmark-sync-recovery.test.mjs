import assert from "node:assert/strict"
import test from "node:test"

const stores = {
  local: new Map(),
  sync: new Map()
}
const listeners = new Set()
let failSyncSet = null

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
  stores.local.clear()
  stores.sync.clear()
  failSyncSet = null
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

test("keeps the previous manifest readable when a later chunk write fails", async () => {
  reset()
  await seedPreviousFolders()
  const bookmarks = new BookmarksService()
  let chunkWrites = 0
  failSyncSet = (values) => {
    if (
      !Object.keys(values).some((key) =>
        key.startsWith("bookmark-folders-chunk--")
      )
    )
      return false
    chunkWrites += 1
    return chunkWrites === 2
  }

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
