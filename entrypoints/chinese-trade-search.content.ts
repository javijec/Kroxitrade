import { tradeHosts } from "~/lib/config/trade-hosts"
import { tradeContext } from "~/lib/core/trade-context"
import { multiselect } from "~/lib/site-adapter/selectors/common"

/**
 * Fuzzy Chinese search for English-only filter dropdowns.
 *
 * Some trade filter dropdowns — "完成地圖獎勵" (map completion reward), the Maven
 * "傳奇獎勵" (unique reward), the Ultimatum legacy reward list, … — build their
 * vue-multiselect option list from the item data's ENGLISH `name` field, so each
 * option is { id, text } with BOTH set to the English name. vue-multiselect
 * searches its options by the `text` label, so typing a Chinese fragment finds
 * nothing ("No elements found") — unlike the main item search, whose options
 * already carry bilingual "中文 (English)" text and so filter fine on Chinese.
 *
 * This MAIN-world pass rewrites each such option's `text` to bilingual
 * "中文 (English)" (leaving `id` — the value sent to the trade API — untouched),
 * so the native substring search matches Chinese, exactly like the item search.
 * A reverse lookup only resolves complete Chinese names, so it cannot support a
 * partial fragment such as "魔". This pass keeps the bilingual text directly in
 * the native options, which lets the site's own fuzzy search handle fragments.
 *
 * The Chinese names are derived from the already-injected bilingual
 * lscache-tradeitems, so this self-gates: when the site data isn't translated
 * (native pathofexile.tw, POE2, or translation disabled) there are no Chinese
 * names to apply and every option is left untouched.
 *
 * Must run in the MAIN world because it reads the page's own vue-multiselect
 * component instances (el.__vue__) to mutate the reactive option objects.
 */
export default defineContentScript({
  matches: tradeHosts,
  world: "MAIN",
  runAt: "document_idle",

  main() {
    const norm = (s: string) =>
      String(s).toLowerCase().replace(/[^a-z0-9]/g, "")
    const hasZh = (s: string) => /[一-鿿]/.test(s)

    // Normalized English item name -> Chinese name (unique name only, base type
    // stripped) built from the injected bilingual item data.
    let nameZh: Record<string, string> = {}
    let itemDataSnapshot: string | null = null

    // The localized "Any" string ("任何"). These English-item dropdowns keep the
    // no-selection option as { id: null, text: "Any" }, so the collapsed value
    // renders as an untranslated "ANY" while every other dropdown shows "任何".
    // We copy the string from any sibling dropdown that already has a localized
    // null-id option, so it stays correct for both Traditional and Simplified.
    let localizedAny = ""

    const findLocalizedAny = () => {
      if (localizedAny) return
      for (const el of document.querySelectorAll<HTMLElement>(multiselect)) {
        const v = (el as unknown as { __vue__?: { options?: unknown[] } }).__vue__
        if (!v || !Array.isArray(v.options)) continue
        for (const raw of v.options) {
          const o = raw as { id?: string | null; text?: string }
          if (o && typeof o === "object" && (o.id == null || o.id === "") && o.text && hasZh(o.text)) {
            localizedAny = o.text
            return
          }
        }
      }
    }

    const buildNameMap = () => {
      const snapshot = localStorage.getItem(
        tradeContext.get().game === "poe2"
          ? "lscache-trade2items"
          : "lscache-tradeitems"
      )
      if (!snapshot || snapshot === itemDataSnapshot) return
      itemDataSnapshot = snapshot

      let ti: unknown
      try {
        ti = JSON.parse(snapshot)
      } catch {
        return
      }
      if (!Array.isArray(ti)) return

      const baseZh: Record<string, string> = {}
      const next: Record<string, string> = {}

      // Pass 1 — base-type Chinese, taken from non-unique entries whose text is
      // "中文 (English)" (e.g. "羊角法杖 (Goat's Horn)").
      for (const cat of ti) {
        for (const e of (cat as { entries?: unknown[] })?.entries || []) {
          const it = e as {
            flags?: { unique?: boolean }
            type?: string
            text?: string
            name?: string
          }
          if (!it?.flags?.unique && it?.type && it?.text) {
            const m = String(it.text).match(/^(.+?)\s*\((.+)\)\s*$/)
            if (m && hasZh(m[1])) baseZh[it.type] = m[1].trim()
          }
        }
      }

      // Pass 2 — unique names. The unique's text is
      // "中文名 中文base (EnglishName EnglishBase)"; strip the trailing Chinese
      // base type so the option shows just "艾貝拉斯之角 (Abberath's Horn)".
      for (const cat of ti) {
        for (const e of (cat as { entries?: unknown[] })?.entries || []) {
          const it = e as {
            flags?: { unique?: boolean }
            type?: string
            text?: string
            name?: string
          }
          if (it?.flags?.unique && it?.name && it?.text) {
            const zhPortion = String(it.text).split(" (")[0]
            const zhBase = it.type ? baseZh[it.type] : undefined
            let zhName = zhPortion
            if (zhBase && zhPortion.endsWith(zhBase)) {
              zhName = zhPortion
                .slice(0, zhPortion.length - zhBase.length)
                .trim()
            }
            if (hasZh(zhName)) next[norm(it.name)] = zhName
          }
        }
      }

      if (Object.keys(next).length) nameZh = next
    }

    // Unify a no-selection "Any" option/value with the localized "任何" the rest
    // of the UI uses. Returns true if it changed the object.
    const fixAny = (o: unknown): boolean => {
      const opt = o as { id?: string | null; text?: string }
      if (
        opt &&
        typeof opt === "object" &&
        (opt.id == null || opt.id === "") &&
        opt.text === "Any" &&
        localizedAny
      ) {
        opt.text = localizedAny
        return true
      }
      return false
    }

    const patch = () => {
      if (!Object.keys(nameZh).length) return
      const widgets = document.querySelectorAll<HTMLElement>(multiselect)
      for (const el of widgets) {
        const v = (el as unknown as {
          __vue__?: {
            options?: unknown[]
            internalValue?: unknown
            value?: unknown
            $forceUpdate?: () => void
          }
        }).__vue__
        if (!v || !Array.isArray(v.options)) continue
        let changed = false
        for (const raw of v.options) {
          const o = raw as { id?: string | null; text?: string }
          if (!o || typeof o !== "object" || !o.text) continue
          // No-selection option in the list.
          if (fixAny(o)) {
            changed = true
            continue
          }
          // English-item option ({ id, text } both the English name): make the
          // text bilingual so the native substring search matches Chinese.
          if (o.id && o.id === o.text && !hasZh(o.text)) {
            const zh = nameZh[norm(o.id)]
            if (zh) {
              o.text = `${zh} (${o.id})`
              changed = true
            }
          }
        }
        // The collapsed value is rendered from the SELECTED object, which is a
        // separate object from options[0]; fix it too so the widget shows "任何"
        // instead of an untranslated "Any".
        for (const sel of [v.internalValue, v.value]) {
          if (Array.isArray(sel)) {
            for (const o of sel) if (fixAny(o)) changed = true
          } else if (fixAny(sel)) {
            changed = true
          }
        }
        if (changed && typeof v.$forceUpdate === "function") v.$forceUpdate()
      }
    }

    const tick = () => {
      if (!Object.keys(nameZh).length) buildNameMap()
      findLocalizedAny()
      patch()
    }

    // Initial retries cover the asynchronous first render of the filter panel
    // and its item data. Once it is available, react only to Trade-form DOM
    // changes instead of scanning all dropdowns once per second indefinitely.
    tick()
    ;[400, 1200, 2500, 5000].forEach((d) => setTimeout(tick, d))

    const TRADE_FORM_SELECTOR = [
      ".search-advanced",
      ".search-advanced-items",
      ".search-advanced-pane",
      ".search-form",
      ".search-bar"
    ].join(", ")
    let scheduled = false
    const scheduleTick = () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        tick()
      })
    }
    const isTradeFormMutation = (node: Node) => {
      const element = node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement
      return !!element?.closest(TRADE_FORM_SELECTOR)
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (isTradeFormMutation(mutation.target)) {
          scheduleTick()
          return
        }
        for (const node of mutation.addedNodes) {
          if (isTradeFormMutation(node)) {
            scheduleTick()
            return
          }
        }
      }
    })
    if (document.body) observer.observe(document.body, { childList: true, subtree: true })
  }
})
