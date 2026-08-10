import { tradeHosts } from "~/lib/config/trade-hosts"
import {
  chineseTradeMessage,
  chineseTradeStorageFor
} from "~/lib/services/chinese-trade/contract"
import {
  applyTradeTemplate,
  normalizeEnglishTradeText,
  resolveTradeDisplayText
} from "~/lib/services/chinese-trade/text-transform"
import { getTradeTranslationState } from "~/lib/services/trade-translation"

type Modifier = { tw: string; us?: string; opt?: Record<string, string> }

const requestTemplates = (version: "poe1" | "poe2") =>
  new Promise<Record<string, string>>((resolve) => {
    chrome.runtime.sendMessage(
      { type: chineseTradeMessage.getTemplates, version },
      (reply) => resolve(reply?.templates ?? {})
    )
  })

const isChinese = (value: string) => /[一-鿿]/.test(value)
const numberTokens = /[+-]?\d+(?:\.\d+)?/g
const templateTokens = /[+-]?#/g

const getLineElements = (container: HTMLElement) => {
  const spans = Array.from(
    container.querySelectorAll<HTMLElement>(":scope > span")
  )
  return spans.length ? spans : [container]
}

const renderModifier = (modifier: Modifier | undefined, rendered: string) => {
  if (!modifier?.tw || !rendered || isChinese(rendered)) return undefined
  if (modifier.opt && modifier.us?.includes("#")) {
    const splitAt = modifier.us.indexOf("#")
    const before = modifier.us.slice(0, splitAt)
    const after = modifier.us.slice(splitAt + 1)
    if (rendered.startsWith(before) && rendered.endsWith(after)) {
      const choice = rendered
        .slice(before.length, rendered.length - after.length)
        .trim()
      if (modifier.opt[choice])
        return modifier.tw.replace("#", modifier.opt[choice])
    }
  }
  const values = rendered.match(numberTokens) ?? []
  let position = 0
  return modifier.tw.replace(templateTokens, () => values[position++] ?? "#")
}

/**
 * Localizes result modifiers without touching Trade ids, roll ranges, or
 * filter actions. A complete template table is preferred; the stat-id map is
 * only used when a result line has no template entry.
 */
export default defineContentScript({
  matches: tradeHosts,
  runAt: "document_end",

  async main() {
    const state = await getTradeTranslationState()
    if (!state.enabled) return

    const locale =
      state.language === "zh-cn"
        ? chineseTradeStorageFor(state.version).simplified
        : chineseTradeStorageFor(state.version).traditional
    let templates: Record<string, string> = {}
    let modifiers: Record<string, Modifier> = {}

    try {
      templates = await requestTemplates(state.version)
    } catch {
      // Result modifiers still use the smaller stat-id cache as a fallback.
    }

    const translate = (element: HTMLElement) => {
      const content =
        element.querySelector<HTMLElement>("[data-field]") ??
        element.querySelector<HTMLElement>(".lc") ??
        element
      const modifier = modifiers[element.dataset.hash ?? ""]
      for (const line of getLineElements(content)) {
        const source = line.textContent?.trim() ?? ""
        if (!source || isChinese(source)) continue
        const fromTemplate = templates[normalizeEnglishTradeText(source)]
        const output = fromTemplate
          ? applyTradeTemplate(fromTemplate, source)
          : renderModifier(modifier, source)
        if (output && output !== source)
          line.textContent = resolveTradeDisplayText(output)
      }
    }

    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(".item-mod"))
        translate(root)
      root.querySelectorAll<HTMLElement>(".item-mod").forEach(translate)
    }

    const applyCache = (data: Record<string, unknown>) => {
      const nextModifiers = data[locale.modifiers]
      if (nextModifiers && typeof nextModifiers === "object") {
        modifiers = nextModifiers as Record<string, Modifier>
      }
      if (document.body) scan(document.body)
    }

    try {
      chrome.storage.local.get([locale.modifiers], (data) =>
        applyCache(data as Record<string, unknown>)
      )
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return
        const changed: Record<string, unknown> = {}
        for (const key of [locale.modifiers]) {
          if (changes[key]) changed[key] = changes[key].newValue
        }
        if (Object.keys(changed).length) applyCache(changed)
      })
    } catch {
      return
    }

    const pending = new Set<HTMLElement>()
    let framePending = false
    const processPending = () => {
      framePending = false
      const additions = [...pending]
      pending.clear()
      for (const node of additions) {
        if (node.isConnected) scan(node)
      }
    }
    new MutationObserver((changes) => {
      for (const change of changes) {
        for (const node of change.addedNodes) {
          if (node instanceof HTMLElement) pending.add(node)
        }
      }
      if (!framePending && pending.size) {
        framePending = true
        requestAnimationFrame(processPending)
      }
    }).observe(document.body, { childList: true, subtree: true })
  }
})
