import type { PoeGame, TradeContext, TradeRoute } from "../types/trade-context"
import { subscribeNavigation } from "./trade-navigation.ts"

const HOST_LANGUAGE: Record<string, string> = {
  "pathofexile.com": "en",
  "www.pathofexile.com": "en",
  "br.pathofexile.com": "pt-br",
  "ru.pathofexile.com": "ru",
  "th.pathofexile.com": "th",
  "de.pathofexile.com": "de",
  "fr.pathofexile.com": "fr",
  "es.pathofexile.com": "es",
  "jp.pathofexile.com": "ja",
  "pathofexile.tw": "zh-tw",
  "poe.kakaogames.com": "ko",
  "poe2.kakaogames.com": "ko"
}

const parseGame = (pathname: string): PoeGame =>
  pathname.startsWith("/trade2/") ? "poe2" : "poe1"

const parseRoute = (pathname: string): TradeRoute => {
  const route = pathname.split("/").filter(Boolean)[1]
  if (
    route === "search" ||
    route === "exchange" ||
    route === "bulk" ||
    route === "live"
  ) {
    return route
  }
  return "other"
}

const parseContext = (location: Location | undefined): TradeContext => {
  if (!location) {
    return {
      game: "poe1",
      host: "",
      language: "en",
      route: "other",
      isNativeChinese: false
    }
  }

  return {
    game: parseGame(location.pathname),
    host: location.hostname,
    language: HOST_LANGUAGE[location.hostname] ?? "en",
    route: parseRoute(location.pathname),
    isNativeChinese: location.hostname === "pathofexile.tw"
  }
}

type Listener = (context: TradeContext) => void

const listeners = new Set<Listener>()
let navigationUnsubscribe: (() => void) | null = null

const notify = () => {
  const context = tradeContext.get()
  for (const listener of listeners) {
    listener(context)
  }
}

const ensureNavigationSubscription = () => {
  if (navigationUnsubscribe) return
  navigationUnsubscribe = subscribeNavigation(() => notify())
}

export const tradeContext = {
  get(): TradeContext {
    return parseContext(
      typeof window !== "undefined" ? window.location : undefined
    )
  },

  /**
   * Subscribe to context changes. The listener is invoked on the next microtask
   * with the current context, then again whenever the SPA navigates to a new
   * URL. Returns an unsubscribe function that detaches the listener; the
   * internal navigation subscription is torn down once the last listener
   * leaves.
   */
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    ensureNavigationSubscription()
    queueMicrotask(() => {
      if (listeners.has(listener)) listener(tradeContext.get())
    })
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0 && navigationUnsubscribe) {
        navigationUnsubscribe()
        navigationUnsubscribe = null
      }
    }
  }
}
