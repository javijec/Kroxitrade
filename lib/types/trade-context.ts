export type PoeGame = "poe1" | "poe2"

export type TradeRoute = "search" | "exchange" | "bulk" | "live" | "other"

export interface TradeContext {
  game: PoeGame
  host: string
  language: string
  route: TradeRoute
  isNativeChinese: boolean
}
