// Detects the "Reward: <unique>" line on Valdo's Rest / Lost Remnant map
// results so their expected value can be shown next to the listing price.

export const extractValdoRewardName = (row: HTMLElement): string | null => {
  const itemRoot = row.querySelector<HTMLElement>(
    ".itemBoxContent, .itemPopupContainer, .middle"
  )
  const rewardValue = itemRoot
    ?.querySelector<HTMLElement>(
      '.item-property .lc[type="76"] > span:last-child'
    )
    ?.textContent?.trim()
  if (rewardValue) return rewardValue

  const itemText = (
    itemRoot?.innerText ||
    row.innerText ||
    itemRoot?.textContent ||
    row.textContent ||
    ""
  ).replace(/\r/g, "")
  if (!/\bValdo(?:'s)? Map\b|\bLost Remnant\b/i.test(itemText)) return null

  const match = itemText.match(/^\s*Reward\s*[:：]\s*(.+?)\s*$/im)
  return match?.[1]?.trim() || null
}
