import assert from "node:assert/strict"
import test from "node:test"

const POPSTATE = "popstate"
const NAVIGATION_EVENT = "krox:navigation"

const makeWindow = () => {
  const listeners = new Map()
  return {
    listeners,
    addEventListener: (type, listener) => {
      if (!listeners.has(type)) listeners.set(type, [])
      listeners.get(type).push(listener)
    },
    removeEventListener: (type, listener) => {
      const list = listeners.get(type)
      if (!list) return
      const index = list.indexOf(listener)
      if (index !== -1) list.splice(index, 1)
    },
    fire: (type) => {
      const list = listeners.get(type) || []
      for (const listener of list) listener()
    },
    location: {
      hostname: "pathofexile.com",
      pathname: "/trade/search",
      href: "https://www.pathofexile.com/trade/search"
    }
  }
}

let win = makeWindow()

const installWindow = () => {
  win = makeWindow()
  globalThis.window = win
  globalThis.history = {}
}

const { tradeContext } = await import("../lib/core/trade-context.ts")

test("get() returns the current parsed context", () => {
  installWindow()
  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade/search/poe1",
    href: "https://www.pathofexile.com/trade/search/poe1"
  }

  const context = tradeContext.get()
  assert.equal(context.host, "www.pathofexile.com")
  assert.equal(context.game, "poe1")
  assert.equal(context.route, "search")
  assert.equal(context.language, "en")
  assert.equal(context.isNativeChinese, false)
})

test("get() detects PoE2 and exchange routes", () => {
  installWindow()
  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade2/exchange/poe2",
    href: "https://www.pathofexile.com/trade2/exchange/poe2"
  }

  const context = tradeContext.get()
  assert.equal(context.game, "poe2")
  assert.equal(context.route, "exchange")
})

test("get() recognises the native Chinese host", () => {
  installWindow()
  win.location = {
    hostname: "pathofexile.tw",
    pathname: "/trade/search",
    href: "https://pathofexile.tw/trade/search"
  }

  const context = tradeContext.get()
  assert.equal(context.isNativeChinese, true)
  assert.equal(context.language, "zh-tw")
})

test("subscribe fires the listener with the current context after a microtask", async () => {
  installWindow()
  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade/search/poe1",
    href: "https://www.pathofexile.com/trade/search/poe1"
  }

  const handler = test.mock.fn()
  const unsubscribe = tradeContext.subscribe(handler)
  await Promise.resolve()

  assert.equal(handler.mock.calls.length, 1)
  assert.equal(handler.mock.calls[0].arguments[0].host, "www.pathofexile.com")
  assert.equal(handler.mock.calls[0].arguments[0].game, "poe1")
  unsubscribe()
})

test("subscribe fires on popstate with the updated context", async () => {
  installWindow()
  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade/search",
    href: "https://www.pathofexile.com/trade/search"
  }

  const handler = test.mock.fn()
  const unsubscribe = tradeContext.subscribe(handler)
  await Promise.resolve()

  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade/exchange",
    href: "https://www.pathofexile.com/trade/exchange"
  }
  win.fire(POPSTATE)

  assert.equal(handler.mock.calls.length, 2)
  assert.equal(handler.mock.calls[1].arguments[0].route, "exchange")
  unsubscribe()
})

test("subscribe fires on the krox:navigation custom event", async () => {
  installWindow()
  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade/search",
    href: "https://www.pathofexile.com/trade/search"
  }

  const handler = test.mock.fn()
  const unsubscribe = tradeContext.subscribe(handler)
  await Promise.resolve()

  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade2/search",
    href: "https://www.pathofexile.com/trade2/search"
  }
  win.fire(NAVIGATION_EVENT)

  assert.equal(handler.mock.calls.length, 2)
  assert.equal(handler.mock.calls[1].arguments[0].game, "poe2")
  unsubscribe()
})

test("unsubscribe stops further notifications", async () => {
  installWindow()
  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade/search",
    href: "https://www.pathofexile.com/trade/search"
  }

  const handler = test.mock.fn()
  const unsubscribe = tradeContext.subscribe(handler)
  await Promise.resolve()
  unsubscribe()

  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade/exchange",
    href: "https://www.pathofexile.com/trade/exchange"
  }
  win.fire(POPSTATE)

  assert.equal(handler.mock.calls.length, 1)
})

test("multiple subscribers all get notified", async () => {
  installWindow()
  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade/search",
    href: "https://www.pathofexile.com/trade/search"
  }

  const handler1 = test.mock.fn()
  const handler2 = test.mock.fn()
  const unsubscribe1 = tradeContext.subscribe(handler1)
  const unsubscribe2 = tradeContext.subscribe(handler2)
  await Promise.resolve()

  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade/exchange",
    href: "https://www.pathofexile.com/trade/exchange"
  }
  win.fire(POPSTATE)

  assert.equal(handler1.mock.calls.length, 2)
  assert.equal(handler2.mock.calls.length, 2)
  unsubscribe1()
  unsubscribe2()
})

test("last unsubscribe removes both window listeners", () => {
  installWindow()
  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade/search",
    href: "https://www.pathofexile.com/trade/search"
  }

  const unsubscribe = tradeContext.subscribe(() => {})
  assert.equal(win.listeners.get(POPSTATE)?.length, 1)
  assert.equal(win.listeners.get(NAVIGATION_EVENT)?.length, 1)

  unsubscribe()
  assert.equal(win.listeners.get(POPSTATE)?.length, 0)
  assert.equal(win.listeners.get(NAVIGATION_EVENT)?.length, 0)
})

test("keep listeners until the last unsubscribe clears them", async () => {
  installWindow()
  win.location = {
    hostname: "www.pathofexile.com",
    pathname: "/trade/search",
    href: "https://www.pathofexile.com/trade/search"
  }

  const unsubscribeA = tradeContext.subscribe(() => {})
  const unsubscribeB = tradeContext.subscribe(() => {})
  await Promise.resolve()

  unsubscribeA()
  assert.equal(win.listeners.get(POPSTATE)?.length, 1)
  assert.equal(win.listeners.get(NAVIGATION_EVENT)?.length, 1)

  unsubscribeB()
  assert.equal(win.listeners.get(POPSTATE)?.length, 0)
  assert.equal(win.listeners.get(NAVIGATION_EVENT)?.length, 0)
})
