// Central DOM observer. The Trade site is an SPA that churns the DOM
// constantly, so every feature wiring itself with its own MutationObserver
// multiplies the work. This service owns a single MutationObserver on
// document.body and dispatches to per-feature subscriptions.

export type TradeDomSubscription = {
  id: string
  // Only notify when a mutation involves an element matching this selector:
  // the added node itself matches, it contains a matching descendant, or the
  // mutation target sits inside a matching container. Omit to observe every
  // mutation.
  selector?: string
  // Coalesce notifications within this window (ms). Omit for sync dispatch.
  // Added nodes observed within the window are accumulated, never replaced.
  debounceMs?: number
  // Called with the batch of relevant added HTMLElement nodes. When the
  // subscription is registered (or when the debounce window elapses) it
  // receives an empty array so consumers can run a full refresh pass.
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

    // No consumers left: stop observing instead of keeping a global observer
    // running for nothing.
    if (this.subscriptions.size === 0) {
      this.observer?.disconnect()
      this.observer = null
      this.started = false
    }
  }

  private start() {
    if (this.started) return
    if (typeof document === "undefined" || !document.body) return
    this.started = true
    this.observer = new MutationObserver((mutations) => {
      for (const subscription of this.subscriptions.values()) {
        const nodes = this.collectRelevant(subscription, mutations)
        if (nodes.length === 0) continue
        this.dispatch(subscription, nodes)
      }
    })
    this.observer.observe(document.body, { childList: true, subtree: true })
  }

  private collectRelevant(
    subscription: TradeDomSubscription,
    mutations: MutationRecord[]
  ): HTMLElement[] {
    const { selector } = subscription
    const relevant: HTMLElement[] = []
    const seen = new Set<HTMLElement>()
    const push = (node: HTMLElement) => {
      if (!(node instanceof HTMLElement) || seen.has(node)) return
      seen.add(node)
      relevant.push(node)
    }

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue
        // The added node is the relevant element or it contains one.
        if (
          !selector ||
          node.matches?.(selector) ||
          node.querySelector?.(selector)
        ) {
          push(node)
        }
      }
      // Fallback: the mutation happened inside a matching container even
      // though the added nodes themselves did not match the selector.
      if (
        selector &&
        mutation.target instanceof Element &&
        mutation.target.closest(selector)
      ) {
        push(mutation.target as HTMLElement)
      }
    }
    return relevant
  }

  private dispatch(subscription: TradeDomSubscription, nodes: HTMLElement[]) {
    if (!subscription.debounceMs) {
      subscription.handler(nodes)
      return
    }
    // Accumulate every batch that arrives within the debounce window instead
    // of replacing the previous one, so no added node is lost.
    const pending = this.pendingNodes.get(subscription.id) ?? []
    this.pendingNodes.set(subscription.id, [...pending, ...nodes])
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
