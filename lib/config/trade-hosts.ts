import { tradeContext } from "../core/trade-context"

export const tradeHosts = [
  "https://www.pathofexile.com/trade*",
  "https://pathofexile.com/trade*",
  "https://br.pathofexile.com/trade*",
  "https://ru.pathofexile.com/trade*",
  "https://th.pathofexile.com/trade*",
  "https://de.pathofexile.com/trade*",
  "https://fr.pathofexile.com/trade*",
  "https://es.pathofexile.com/trade*",
  "https://jp.pathofexile.com/trade*",
  "https://pathofexile.tw/trade*",
  "https://poe.kakaogames.com/trade*",
  "https://poe2.kakaogames.com/trade*"
]

export const tradeHostPermissions = [
  "https://www.pathofexile.com/*",
  "https://br.pathofexile.com/*",
  "https://ru.pathofexile.com/*",
  "https://th.pathofexile.com/*",
  "https://de.pathofexile.com/*",
  "https://fr.pathofexile.com/*",
  "https://es.pathofexile.com/*",
  "https://jp.pathofexile.com/*",
  "https://pathofexile.tw/*",
  "https://poe.kakaogames.com/*",
  "https://poe2.kakaogames.com/*"
]

export const isNativeChineseTradeSite = () => tradeContext.get().isNativeChinese

export const isPoe2TradeSite = () => tradeContext.get().game === "poe2"
