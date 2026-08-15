import type { PoeGame, TradeContext, TradeRoute } from "../types/trade-context"

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

export const tradeContext = {
  get(): TradeContext {
    return parseContext(
      typeof window !== "undefined" ? window.location : undefined
    )
  }
}
