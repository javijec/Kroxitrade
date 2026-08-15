import { MERCENARY_SKILL_NAMES, MERCENARY_SUPPORT_TW } from "~/data/chinese-trade/mercenary-names"
import { UI_STRINGS } from "~/data/chinese-trade/ui-strings"
import { tradeHosts } from "~/lib/config/trade-hosts"
import { chineseTradeStorageFor } from "~/lib/services/chinese-trade/contract"
import { toSimplifiedChinese } from "~/lib/services/chinese-trade/simplifier"
import { getChineseSupplementState } from "~/lib/services/trade-translation"
import {
  multiselect,
  multiselectInput,
  multiselectItem,
  multiselectOption
} from "~/lib/site-adapter/selectors/common"

// Trade's header, navigation and dialogs sit outside the search/result
// containers. Scan the page root so every known local UI phrase is covered.
const areas = "body"

const ignoredTags = new Set(["SCRIPT", "STYLE", "INPUT", "TEXTAREA", "SELECT", "NOSCRIPT"])
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")
const containsChinese = (value: string) => /[一-鿿]/.test(value)

type ModifierMap = Record<string, { us?: string; tw?: string }>

export default defineContentScript({
  matches: tradeHosts,
  excludeMatches: [
    "https://poe.kakaogames.com/*",
    "https://poe2.kakaogames.com/*"
  ],
  runAt: "document_idle",

  async main() {
    const state = await getChineseSupplementState()
    if (!state.enabled) return

    const simplified = state.language === "zh-cn"
    const convert = simplified ? toSimplifiedChinese : (value: string) => value
    const storage = chineseTradeStorageFor(state.version)
    const locale = simplified ? storage.simplified : storage.traditional
    let names: Record<string, string> = {}
    let reverse: Record<string, string> = {}
    let mercenaryNames: Record<string, string> = {}

    const phrases: Record<string, string> = {}
    for (const [english, chinese] of Object.entries(UI_STRINGS)) {
      phrases[normalize(english)] = convert(chinese)
    }
    for (const [english, chinese] of Object.entries(MERCENARY_SUPPORT_TW)) {
      phrases[normalize(english)] = convert(chinese)
    }
    for (const [english, chinese] of Object.entries(MERCENARY_SKILL_NAMES)) {
      mercenaryNames[english] = simplified ? chinese.cn : chinese.tw
    }

    const resolve = (english: string, mercenary = false) => {
      const key = normalize(english)
      if (mercenary && mercenaryNames[key]) return mercenaryNames[key]
      return names[key] || phrases[key]
    }

    const translateText = (text: Text) => {
      const raw = text.nodeValue ?? ""
      const value = raw.trim()
      if (value.length < 2 || containsChinese(value)) return
      const inMercenary = !!text.parentElement?.closest(".item-mod--mercenary")
      const translated = resolve(value, inMercenary)
      if (!translated || translated === value) return
      const option = text.parentElement?.closest(multiselectItem)
      if (option && containsChinese(option.textContent ?? "")) return
      text.nodeValue = raw.replace(value, option ? `${translated} (${value})` : translated)
    }

    const translatePlaceholders = (root: ParentNode) => {
      root.querySelectorAll<HTMLInputElement>("input[placeholder]").forEach((input) => {
        const current = input.placeholder.trim()
        if (!current || containsChinese(current)) return
        const translated = resolve(current)
        if (translated) input.placeholder = translated
      })
    }

    const translateArea = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        translateText(root as Text)
        return
      }
      if (root instanceof Element && ignoredTags.has(root.tagName)) return
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          node.parentElement && !ignoredTags.has(node.parentElement.tagName)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT
      })
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        translateText(node as Text)
      }
      if (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        translatePlaceholders(root as ParentNode)
      }
    }

    const roots = () => Array.from(document.querySelectorAll<HTMLElement>(areas))
    const translateAll = () => roots().forEach(translateArea)

    const updateMercenaries = (map: ModifierMap) => {
      for (const [id, entry] of Object.entries(map)) {
        if (!id.startsWith("mercenary.") || !entry.us || !entry.tw) continue
        mercenaryNames[normalize(entry.us.replace(/\s*\(Tier \d+\)$/i, ""))] =
          convert(entry.tw.replace(/\s*[（(].*?[)）]\s*$/, ""))
      }
    }

    try {
      chrome.storage.local.get(
        [locale.itemNames, locale.reverseNames, locale.modifiers],
        (stored) => {
          const data = stored as Record<string, unknown>
          if (data[locale.itemNames] && typeof data[locale.itemNames] === "object") {
            names = data[locale.itemNames] as Record<string, string>
          }
          if (data[locale.reverseNames] && typeof data[locale.reverseNames] === "object") {
            reverse = data[locale.reverseNames] as Record<string, string>
          }
          if (data[locale.modifiers] && typeof data[locale.modifiers] === "object") {
            updateMercenaries(data[locale.modifiers] as ModifierMap)
          }
          translateAll()
        }
      )
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return
        if (changes[locale.itemNames]?.newValue && typeof changes[locale.itemNames].newValue === "object") {
          names = changes[locale.itemNames].newValue as Record<string, string>
        }
        if (changes[locale.reverseNames]?.newValue && typeof changes[locale.reverseNames].newValue === "object") {
          reverse = changes[locale.reverseNames].newValue as Record<string, string>
        }
        if (changes[locale.modifiers]?.newValue && typeof changes[locale.modifiers].newValue === "object") {
          updateMercenaries(changes[locale.modifiers].newValue as ModifierMap)
        }
        translateAll()
      })
    } catch {
      return
    }

    const pending = new Set<Node>()
    let scheduled = false
    const flush = () => {
      scheduled = false
      const batch = [...pending]
      pending.clear()
      for (const node of batch) if (node.isConnected) translateArea(node)
    }
    const isTradeNode = (node: Node) =>
      node instanceof Element
        ? !!node.closest(areas)
        : !!node.parentElement?.closest(areas)
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (isTradeNode(mutation.target)) pending.add(mutation.target)
        mutation.addedNodes.forEach((node) => {
          if (isTradeNode(node)) pending.add(node)
        })
      }
      if (!scheduled && pending.size) {
        scheduled = true
        requestAnimationFrame(flush)
      }
    }).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder"]
    })

    document.addEventListener("input", (event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || !input.matches(multiselectInput)) return
      const match = input.value.match(/^([\s~+-]*)(.+)$/)
      if (!match || !containsChinese(match[2])) return
      const typed = match[2].trim()
      const english = reverse[typed]
      if (!english) return
      const original = input.value
      // Let vue-multiselect apply its normal filter first. If a bilingual option
      // already matches the Chinese text, preserving the user's text is both
      // clearer and avoids an unnecessary language switch.
      setTimeout(() => {
        if (input.value !== original) return
        const options = input.closest(multiselect)?.querySelectorAll(multiselectOption)
        const hasDirectMatch = Array.from(options ?? []).some((option) =>
          (option.textContent ?? "").includes(typed)
        )
        if (hasDirectMatch) return
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
        setter?.call(input, match[1] + english)
        input.dispatchEvent(new Event("input", { bubbles: true }))
      }, 60)
    }, true)

    translateAll()
  }
})
