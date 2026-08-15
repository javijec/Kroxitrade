import assert from "node:assert/strict"
import test from "node:test"

const BUS_SOURCE = "poe-trade-plus:bus"

let messageListeners = []
const windowMock = {
  addEventListener(type, listener) {
    if (type === "message") messageListeners.push(listener)
  },
  removeEventListener(type, listener) {
    if (type === "message") {
      messageListeners = messageListeners.filter((l) => l !== listener)
    }
  },
  postMessage() {}
}

const { extensionBus } = await import("../lib/core/extension-bus.ts")

const dispatch = (event) =>
  messageListeners.forEach((listener) => listener(event))

const validAction = {
  data: {
    source: BUS_SOURCE,
    channel: "finer-filters:action",
    payload: {
      action: "global-plus",
      types: "explicit.stat_5",
      prefix: "explicit.stat_"
    }
  },
  source: windowMock
}

test.beforeEach(() => {
  globalThis.window = windowMock
  messageListeners = []
})

test("delivers a valid message posted by the window itself", () => {
  const handler = test.mock.fn()
  const unsubscribe = extensionBus.on("finer-filters:action", handler)

  dispatch(validAction)

  assert.equal(handler.mock.calls.length, 1)
  assert.deepEqual(handler.mock.calls[0].arguments[0], validAction.data.payload)
  unsubscribe()
})

test("ignores messages from another source", () => {
  const handler = test.mock.fn()
  const unsubscribe = extensionBus.on("finer-filters:action", handler)

  dispatch({ ...validAction, source: null })
  dispatch({ ...validAction, source: {} })

  assert.equal(handler.mock.calls.length, 0)
  unsubscribe()
})

test("ignores messages with the wrong source tag", () => {
  const handler = test.mock.fn()
  const unsubscribe = extensionBus.on("finer-filters:action", handler)

  dispatch({
    ...validAction,
    data: { ...validAction.data, source: "someone-else" }
  })

  assert.equal(handler.mock.calls.length, 0)
  unsubscribe()
})

test("ignores unknown channels", () => {
  const handler = test.mock.fn()
  const unsubscribe = extensionBus.on("finer-filters:action", handler)

  dispatch({
    ...validAction,
    data: { ...validAction.data, channel: "unknown:channel" }
  })

  assert.equal(handler.mock.calls.length, 0)
  unsubscribe()
})

test("rejects malformed finer-filters payloads", () => {
  const handler = test.mock.fn()
  const unsubscribe = extensionBus.on("finer-filters:action", handler)

  dispatch({
    ...validAction,
    data: {
      ...validAction.data,
      payload: { action: "sideways", types: 1, prefix: 2 }
    }
  })
  dispatch({ ...validAction, data: { ...validAction.data, payload: null } })
  dispatch({
    ...validAction,
    data: { ...validAction.data, payload: "global-plus" }
  })

  assert.equal(handler.mock.calls.length, 0)
  unsubscribe()
})

test("void channels only accept messages without a payload", () => {
  const handler = test.mock.fn()
  const unsubscribe = extensionBus.on("quick-filters:change", handler)

  dispatch({
    data: {
      source: BUS_SOURCE,
      channel: "quick-filters:change",
      payload: undefined
    },
    source: windowMock
  })
  assert.equal(handler.mock.calls.length, 1)

  dispatch({
    data: {
      source: BUS_SOURCE,
      channel: "quick-filters:change",
      payload: { junk: true }
    },
    source: windowMock
  })
  assert.equal(handler.mock.calls.length, 1)
  unsubscribe()
})

test("unsubscribe stops delivering messages", () => {
  const handler = test.mock.fn()
  const unsubscribe = extensionBus.on("finer-filters:action", handler)

  unsubscribe()
  dispatch(validAction)

  assert.equal(handler.mock.calls.length, 0)
})
