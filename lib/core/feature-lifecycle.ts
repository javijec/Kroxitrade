// Explicit start()/stop() lifecycle for page features.
//
// Each feature wires its listeners and subscriptions lazily on start() and
// tears them all down on stop(). Both operations are idempotent, so callers
// can start a feature, restart it after a stop, or stop an already-stopped
// feature without leaking listeners or double-wiring handlers.

export interface FeatureLifecycle {
  readonly id: string
  start(): void
  stop(): void
}

/**
 * Wrap a feature wiring function into an idempotent start()/stop() lifecycle.
 *
 * `wire` registers the feature's listeners/subscriptions and returns a teardown
 * function. start() calls it once and keeps the teardown; stop() runs it and
 * resets the feature so a later start() re-wires it from scratch.
 */
export const createFeatureLifecycle = (
  id: string,
  wire: () => () => void
): FeatureLifecycle => {
  let teardown: (() => void) | null = null
  return {
    id,
    start() {
      if (teardown) return
      teardown = wire()
    },
    stop() {
      if (!teardown) return
      const stop = teardown
      teardown = null
      stop()
    }
  }
}
