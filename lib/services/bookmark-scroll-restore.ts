export type ScrollRestoreOutcome = "abort" | "idle" | "settle" | "retry"

export type ScrollRestoreInput = {
  savedTop: number | null
  scrollHeight: number
  clientHeight: number
  userInteracted: boolean
}

/**
 * Picks the action for one scroll-restore tick.
 *
 * `retry` covers rows still loading; `abort` outranks it so a restore never
 * fights the wheel while the saved offset stays out of reach.
 */
export const decideScrollRestore = ({
  savedTop,
  scrollHeight,
  clientHeight,
  userInteracted
}: ScrollRestoreInput): ScrollRestoreOutcome => {
  if (userInteracted) return "abort"
  if (savedTop === null || !Number.isFinite(savedTop) || savedTop < 0) return "idle"

  const maxTop = Math.max(0, scrollHeight - clientHeight)
  return maxTop >= savedTop ? "settle" : "retry"
}
