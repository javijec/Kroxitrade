import { storageService } from "./storage"

export const SYNC_JOURNAL_KEY = "sync-journal"

type SyncJournalMutation = {
  key: string
  value?: unknown
  raw?: boolean
  updatedAt: number
}

type SyncJournal = {
  version: 1
  mutations: SyncJournalMutation[]
}

const EMPTY_JOURNAL: SyncJournal = { version: 1, mutations: [] }

const readJournal = async () =>
  (await storageService.getValue<SyncJournal>(SYNC_JOURNAL_KEY)) || EMPTY_JOURNAL

const normalizeJournal = (journal: SyncJournal): SyncJournal => {
  const latest = new Map<string, SyncJournalMutation>()
  for (const mutation of journal.mutations || []) {
    if (!mutation?.key) continue
    const previous = latest.get(mutation.key)
    if (!previous || previous.updatedAt <= mutation.updatedAt) {
      latest.set(mutation.key, mutation)
    }
  }
  return { version: 1, mutations: [...latest.values()] }
}

export const getPendingSyncValue = async <T>(key: string): Promise<T | null> => {
  const journal = normalizeJournal(await readJournal())
  const mutation = journal.mutations.find((entry) => entry.key === key)
  return mutation && "value" in mutation ? (mutation.value as T) : null
}

export const stageSyncValue = async (key: string, value: unknown) => {
  const journal = normalizeJournal(await readJournal())
  const next = normalizeJournal({
    version: 1,
    mutations: [
      ...journal.mutations,
      { key, value, updatedAt: Date.now() }
    ]
  })
  return storageService.setValue(SYNC_JOURNAL_KEY, next)
}

export const stageSyncDeletion = async (key: string) => {
  const journal = normalizeJournal(await readJournal())
  const next = normalizeJournal({
    version: 1,
    mutations: [...journal.mutations, { key, updatedAt: Date.now() }]
  })
  return storageService.setValue(SYNC_JOURNAL_KEY, next)
}

export const stageRawSyncValue = async (key: string, value: unknown) => {
  const journal = normalizeJournal(await readJournal())
  return storageService.setValue(
    SYNC_JOURNAL_KEY,
    normalizeJournal({
      version: 1,
      mutations: [
        ...journal.mutations,
        { key, value, raw: true, updatedAt: Date.now() }
      ]
    })
  )
}

export const stageRawSyncDeletion = async (key: string) => {
  const journal = normalizeJournal(await readJournal())
  return storageService.setValue(
    SYNC_JOURNAL_KEY,
    normalizeJournal({
      version: 1,
      mutations: [
        ...journal.mutations,
        { key, raw: true, updatedAt: Date.now() }
      ]
    })
  )
}

export const flushSyncJournal = async () => {
  const journal = normalizeJournal(await readJournal())
  for (const mutation of journal.mutations) {
    const saved = mutation.raw
      ? await flushRawSyncMutation(mutation)
      : "value" in mutation
        ? await storageService.setValue(mutation.key, mutation.value, null, "sync")
        : await storageService.deleteValue(mutation.key, null, "sync")
    if (!saved) throw new Error(`Could not flush sync journal key: ${mutation.key}`)

    const latest = normalizeJournal(await readJournal())
    await storageService.setValue(
      SYNC_JOURNAL_KEY,
      {
        version: 1,
        mutations: latest.mutations.filter(
          (entry) =>
            entry.key !== mutation.key || entry.updatedAt > mutation.updatedAt
        )
      }
    )
  }
}

const flushRawSyncMutation = async (mutation: SyncJournalMutation) => {
  if (typeof chrome === "undefined" || !chrome.storage?.sync) return false
  try {
    if ("value" in mutation) {
      await chrome.storage.sync.set({ [mutation.key]: mutation.value })
    } else {
      await chrome.storage.sync.remove(mutation.key)
    }
    return true
  } catch {
    return false
  }
}
