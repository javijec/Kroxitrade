// Typed, world-agnostic message bus for the Trade site page.
//
// The sidebar (isolated world) and the MAIN-world content scripts cannot share
// modules or globals, so messages travel through window.postMessage — the same
// transport the legacy finer-filters bridge relied on — and are validated
// before dispatch. Features only know a channel name and a payload type.

export type FinerFiltersAction = "global-plus" | "global-minus"

export type FinerFiltersActionDetail = {
  action: FinerFiltersAction
  types: string
  prefix: string
}

// Runtime list so inbound messages can be checked against the known channels.
export const BUS_CHANNELS = [
  "finer-filters:action",
  "quick-filters:change",
  "item-results:experimental-change"
] as const

export type ExtensionBusChannel = (typeof BUS_CHANNELS)[number]

export interface ExtensionBusEvents {
  "finer-filters:action": FinerFiltersActionDetail
  "quick-filters:change": void
  "item-results:experimental-change": void
}

const BUS_SOURCE = "poe-trade-plus:bus"

type BusMessage<C extends ExtensionBusChannel> = {
  source: typeof BUS_SOURCE
  channel: C
  payload: ExtensionBusEvents[C]
}

const isBusMessage = (
  data: unknown
): data is BusMessage<ExtensionBusChannel> => {
  if (!data || typeof data !== "object") return false
  const message = data as { source?: unknown; channel?: unknown }
  return (
    message.source === BUS_SOURCE &&
    typeof message.channel === "string" &&
    (BUS_CHANNELS as readonly string[]).includes(message.channel)
  )
}

const isFinerFiltersActionDetail = (
  value: unknown
): value is FinerFiltersActionDetail => {
  if (!value || typeof value !== "object") return false
  const detail = value as Record<string, unknown>
  return (
    (detail.action === "global-plus" || detail.action === "global-minus") &&
    typeof detail.types === "string" &&
    typeof detail.prefix === "string"
  )
}

// Per-channel payload guards. Channels without a payload only accept an absent
// one, so malformed messages are rejected before reaching the handlers.
const payloadValidators: Record<
  ExtensionBusChannel,
  (payload: unknown) => boolean
> = {
  "finer-filters:action": isFinerFiltersActionDetail,
  "quick-filters:change": (payload) => payload === undefined,
  "item-results:experimental-change": (payload) => payload === undefined
}

export const extensionBus = {
  send<C extends ExtensionBusChannel>(
    channel: C,
    payload?: ExtensionBusEvents[C]
  ) {
    if (typeof window === "undefined") return
    try {
      window.postMessage(
        { source: BUS_SOURCE, channel, payload } as BusMessage<C>,
        "*"
      )
    } catch {
      // Ignore bridge errors so the sidebar stays responsive.
    }
  },

  on<C extends ExtensionBusChannel>(
    channel: C,
    handler: (payload: ExtensionBusEvents[C]) => void
  ): () => void {
    const listener = (event: MessageEvent<unknown>) => {
      // Only trust messages this window posted itself; content scripts and
      // the page share the window, frames do not.
      if (event.source !== window) return
      if (!isBusMessage(event.data) || event.data.channel !== channel) return
      if (!payloadValidators[channel](event.data.payload)) return
      handler(event.data.payload as ExtensionBusEvents[C])
    }
    window.addEventListener("message", listener)
    return () => window.removeEventListener("message", listener)
  }
}
