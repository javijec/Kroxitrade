# Manual testing checklist

The automated suites (`pnpm test`, `pnpm test:e2e`) cover the foundation
(selectors, the `tradeDom` accessor, the `tradeFilters` adapter, the
`tradeContext` signal, Finer Filters on PoE1/PoE2, Chinese Trade localization).

What still needs human verification is the **end-to-end behaviour** of every
feature on the real trade site, across both games and both browsers, plus the
SPA navigation contracts. Use this checklist before merging `dev` → `main`.

## Setup

1. Run `pnpm build` (Chrome + Firefox).
2. Chrome: load `build/chrome-mv3` as an unpacked extension.
3. Firefox: load `build/firefox-mv3` as a temporary add-on.
4. Open https://www.pathofexile.com/trade/search/Standard (PoE1) and
   https://www.pathofexile.com/trade2/search/poe2 (PoE2).
5. Open the sidebar ("Kroxi") on each page.

## Matrix

Replace each ✅ with the actual result you observed. Note any glitch in the
"Notes" column; do not mark the cell if anything went wrong.

| Feature                          | PoE1 | PoE2 | Notes |
|----------------------------------|:----:|:----:|-------|
| Bookmarks (create, activate, delete, folder ops) | ☐ | ☐ |  |
| Finer Filters `+` (add mod to AND group)        | ☐ | ☐ |  |
| Finer Filters `-` (add mod to NOT group)        | ☐ | ☐ |  |
| Global presets (`+` / `-` on pseudo stats)      | ☐ | ☐ |  |
| Quick Filters (preset panel, sidebar placement) | ☐ | ☐ |  |
| Buyout Currency (preset + clear)                | ☐ | ☐ |  |
| Auto Fuzzy (`~` prefix on multiselect input)    | ☐ | ☐ |  |
| Compact Layout (toggle button re-scans mods)    | ☐ | ☐ |  |
| Item Results (PoE.ninja, CoE, PoEDB, wiki)       | ☐ | ☐ |  |
| Bulk Sellers (groups, find, buy)                | ☐ | ☐ |  |
| History (recents, bookmarks history)            | ☐ | ☐ |  |
| SPA Navigation (search A → search B → back → forward) | ☐ | ☐ |  |

## SPA navigation scenarios

For each browser, run four scenarios. The extension must keep working after
each navigation event (no orphaned listeners, no stale state).

- **Scenario A — pushState**
  1. Open search A.
  2. Verify the sidebar mounts and Finer Filters shows +/− on a hovered mod.
  3. Navigate to search B via the site's UI (not a full reload).
  4. Verify Finer Filters still decorates mods on search B.

- **Scenario B — back button**
  1. From search B, press the browser back button.
  2. Verify the URL is back to search A and the sidebar still works.

- **Scenario C — forward button**
  1. From search A, press forward.
  2. Verify the URL returns to search B and the sidebar still works.

- **Scenario D — exchange / bulk / live routes**
  1. Navigate to `…/trade/exchange/Standard` (PoE1) and `…/trade2/exchange/poe2` (PoE2).
  2. Verify the sidebar still functions and Finer Filters does not decorate the
     exchange page (Quick Filters intentionally hides itself there).
  3. Navigate to `…/trade/bulk/Standard` and `…/trade2/bulk/poe2`.
  4. Verify the same behaviour.

## What to watch for

- **Listeners leak:** open DevTools → Performance monitor; subscribe count
  should stay flat after multiple navigations.
- **Stale state:** after back/forward, the sidebar should reflect the
  current URL (e.g., PoE1 vs PoE2 label, search vs exchange).
- **Finer Filters dedup:** hovering the same row twice should not duplicate the
  +/− buttons.
- **Bulk Sellers / Item Results:** should re-run on the new results after each
  navigation (refresh delay: 80/220/500/900 ms after a search).

## Browser coverage

| Browser | Profile | Tested |
|---------|---------|:------:|
| Chrome  | `build/chrome-mv3`     | ☐ |
| Firefox | `build/firefox-mv3`    | ☐ |

## When something fails

1. Document the failing feature, browser, and game in the matrix Notes column.
2. Try to capture: URL, a short description, and a screenshot if possible.
3. File the issue (or extend the contract tests in `tests/contracts/` if the
   site markup changed).
4. Do not merge `dev` → `main` until every cell is ✅ or the failures are
   explicitly waived.
