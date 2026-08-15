// Central DOM observer. The Trade site is an SPA that churns the DOM
// constantly, so every feature wiring itself with its own MutationObserver
// multiplies the work. This service owns a single MutationObserver on
// document.body and dispatches to per-feature subscriptions.

export type TradeDomSubscription = {
  id: string
  // Only notify when a mutation happens inside an element matching this
  // selector. Omit to observe every mutation.
  selector?: string
  // Coalesce notifications within this window (ms). Omit for sync dispatch.
  debounceMs?: number
  // Called with the batch of added HTMLElement nodes. When the subscription
  // is registered (or when the debounce window elapses) it receives an empty
  // array so consumers can run a full refresh pass.
  handler: (nodes: HTMLElement[]) => void
}

class TradeDomObserverService {
  private observer: MutationObserver | null = null
  private readonly subscriptions = new Map<string, TradeDomSubscription>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly pendingNodes = new Map<string, HTMLElement[]>()
  private started = false

  subscribe(subscription: TradeDomSubscription): () => void {
    this.unsubscribe(subscription.id)
    this.subscriptions.set(subscription.id, subscription)
    this.start()

    // The page may have already rendered the relevant DOM before this
    // subscription registered, so no mutation will ever fire for it.
    if (
      !subscription.selector ||
      document.querySelector(subscription.selector)
    ) {
      queueMicrotask(() => {
        if (!this.subscriptions.has(subscription.id)) return
        this.dispatch(subscription, [])
      })
    }

    return () => this.unsubscribe(subscription.id)
  }

  private unsubscribe(id: string) {
    const timer = this.timers.get(id)
    if (timer) clearTimeout(timer)
    this.timers.delete(id)
    this.pendingNodes.delete(id)
    this.subscriptions.delete(id)
  }

  private start() {
    if (this.started) return
    if (typeof document === "undefined" || !document.body) return
    this.started = true
    this.observer = new MutationObserver((mutations) => {
      const added: HTMLElement[] = []
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) added.push(node)
        }
      }
      for (const subscription of this.subscriptions.values()) {
        if (!this.matches(subscription, mutations)) continue
        this.dispatch(subscription, added)
      }
    })
    this.observer.observe(document.body, { childList: true, subtree: true })
  }

  private matches(
    subscription: TradeDomSubscription,
    mutations: MutationRecord[]
  ) {
    const { selector } = subscription
    if (!selector) return true
    return mutations.some(
      (mutation) =>
        mutation.target instanceof Element && mutation.target.closest(selector) !== null
    )
  }

  private dispatch(subscription: TradeDomSubscription, nodes: HTMLElement[]) {
    if (!subscription.debounceMs) {
      subscription.handler(nodes)
      return
    }
    this.pendingNodes.set(subscription.id, nodes)
    const timer = this.timers.get(subscription.id)
    if (timer) clearTimeout(timer)
    this.timers.set(
      subscription.id,
      setTimeout(() => {
        this.timers.delete(subscription.id)
        const pending = this.pendingNodes.get(subscription.id) ?? []
        this.pendingNodes.delete(subscription.id)
        subscription.handler(pending)
      }, subscription.debounceMs)
    )
  }
}

export const tradeDomObserver = new TradeDomObserverService()
