import assert from "node:assert/strict"
import test from "node:test"

class MockElement {
  constructor({ matches = false, querySelector = null, closest = null } = {}) {
    this._matches = matches
    this._querySelector = querySelector
    this._closest = closest
  }
  matches() {
    return this._matches
  }
  querySelector() {
    return this._querySelector
  }
  closest() {
    return this._closest
  }
}

let activeObserver = null

class MockMutationObserver {
  constructor(callback) {
    this.callback = callback
    this.disconnected = false
    activeObserver = this
  }
  observe() {}
  disconnect() {
    this.disconnected = true
  }
}

const body = new MockElement()

const installDom = () => {
  globalThis.document = { body, querySelector: () => null }
  globalThis.MutationObserver = MockMutationObserver
  globalThis.HTMLElement = MockElement
  globalThis.Element = MockElement
}

const { tradeDomObserver } = await import("../lib/core/trade-dom-observer.ts")

const fireMutation = (observer, addedNodes, target = body) => {
  observer.callback([{ addedNodes, target }])
}

test("notifies when an added node matches the subscription selector", () => {
  installDom()
  const handler = test.mock.fn()
  const unsubscribe = tradeDomObserver.subscribe({
    id: "match",
    selector: ".result-row",
    handler
  })
  const observer = activeObserver
  const row = new MockElement({ matches: true })
  fireMutation(observer, [row])
  assert.deepEqual(handler.mock.calls.at(-1).arguments[0], [row])
  unsubscribe()
})

test("notifies when an added node contains a matching descendant", () => {
  installDom()
  const handler = test.mock.fn()
  const unsubscribe = tradeDomObserver.subscribe({
    id: "contains",
    selector: ".item-mod",
    handler
  })
  const observer = activeObserver
  const container = new MockElement({ querySelector: {} })
  fireMutation(observer, [container])
  assert.deepEqual(handler.mock.calls.at(-1).arguments[0], [container])
  unsubscribe()
})

test("ignores added nodes unrelated to the subscription selector", () => {
  installDom()
  const handler = test.mock.fn()
  const unsubscribe = tradeDomObserver.subscribe({
    id: "unrelated",
    selector: ".result-row",
    handler
  })
  const observer = activeObserver
  fireMutation(observer, [new MockElement()])
  assert.equal(handler.mock.calls.length, 0)
  unsubscribe()
})

test("falls back to the mutation target inside a matching container", () => {
  installDom()
  const handler = test.mock.fn()
  const unsubscribe = tradeDomObserver.subscribe({
    id: "closest",
    selector: ".search-results",
    handler
  })
  const observer = activeObserver
  const wrapper = new MockElement({ closest: {} })
  fireMutation(observer, [new MockElement()], wrapper)
  assert.deepEqual(handler.mock.calls.at(-1).arguments[0], [wrapper])
  unsubscribe()
})

test("accumulates nodes across batches within the debounce window", async () => {
  test.mock.timers.enable({ apis: ["setTimeout"] })
  try {
    installDom()
    const handler = test.mock.fn()
    const unsubscribe = tradeDomObserver.subscribe({
      id: "debounce",
      debounceMs: 50,
      handler
    })
    const observer = activeObserver
    // Let the initial empty dispatch schedule its timer before mutating.
    await Promise.resolve()

    const a = new MockElement()
    const b = new MockElement()
    const c = new MockElement()
    fireMutation(observer, [a])
    fireMutation(observer, [b])
    fireMutation(observer, [c])
    test.mock.timers.tick(50)

    assert.equal(handler.mock.calls.length, 1)
    assert.deepEqual(handler.mock.calls[0].arguments[0], [a, b, c])
    unsubscribe()
  } finally {
    test.mock.timers.reset()
  }
})

test("disconnects the shared observer when the last subscription is removed", () => {
  installDom()
  const unsubscribeA = tradeDomObserver.subscribe({
    id: "disconnect-a",
    handler: () => {}
  })
  const firstObserver = activeObserver
  const unsubscribeB = tradeDomObserver.subscribe({
    id: "disconnect-b",
    handler: () => {}
  })

  unsubscribeA()
  assert.equal(firstObserver.disconnected, false)

  unsubscribeB()
  assert.equal(firstObserver.disconnected, true)
})

test("a subscription after disconnect starts a fresh observer", () => {
  installDom()
  const unsubscribeA = tradeDomObserver.subscribe({
    id: "restart-a",
    handler: () => {}
  })
  const firstObserver = activeObserver
  unsubscribeA()

  const unsubscribeB = tradeDomObserver.subscribe({
    id: "restart-b",
    handler: () => {}
  })
  const secondObserver = activeObserver

  assert.notEqual(secondObserver, firstObserver)
  assert.equal(secondObserver.disconnected, false)
  unsubscribeB()
})

test("re-subscribing the same id replaces cleanly and unsubscribing twice is safe", () => {
  installDom()
  const handler = test.mock.fn()
  const unsubscribeFirst = tradeDomObserver.subscribe({
    id: "same-id",
    handler
  })
  const firstObserver = activeObserver

  const unsubscribeSecond = tradeDomObserver.subscribe({
    id: "same-id",
    handler
  })

  assert.notEqual(activeObserver, firstObserver)
  unsubscribeSecond()
  assert.doesNotThrow(() => unsubscribeFirst())
})
