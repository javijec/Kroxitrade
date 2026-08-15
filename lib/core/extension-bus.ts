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

export interface ExtensionBusEvents {
  "finer-filters:action": FinerFiltersActionDetail
  "quick-filters:change": void
  "item-results:experimental-change": void
}

export type ExtensionBusChannel = keyof ExtensionBusEvents

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
  return message.source === BUS_SOURCE && typeof message.channel === "string"
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
      if (!isBusMessage(event.data) || event.data.channel !== channel) return
      handler(event.data.payload as ExtensionBusEvents[C])
    }
    window.addEventListener("message", listener)
    return () => window.removeEventListener("message", listener)
  }
}
