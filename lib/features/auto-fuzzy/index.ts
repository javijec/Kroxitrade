// Auto fuzzy "~" — prefixes a "~" regex toggle to text typed into the native
// trade-site search inputs (MAIN world).

import { multiselectInput } from "~/lib/site-adapter/selectors/common"

const setNativeInputValue = (input: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )
  descriptor?.set?.call(input, value)
}

const findTradeSearchInput = (
  target: EventTarget | null
): HTMLInputElement | null => {
  if (!(target instanceof Element)) return null

  const input = target.closest(multiselectInput)
  return input instanceof HTMLInputElement ? input : null
}

export const startAutoFuzzy = (): (() => void) => {
  const prefixingInputs = new WeakSet<HTMLInputElement>()

  const ensureRegexPrefix = (input: HTMLInputElement, inputType?: string) => {
    if (document.documentElement.dataset.kroxAutoFuzzy === "off") return

    const value = input.value ?? ""
    if (!value || value.startsWith("~") || value.startsWith(" ")) return
    if (inputType?.startsWith("delete")) return
    if (prefixingInputs.has(input)) return

    prefixingInputs.add(input)

    try {
      const start = input.selectionStart ?? value.length
      const end = input.selectionEnd ?? value.length
      const canUseRangeText =
        typeof input.setRangeText === "function" &&
        start !== null &&
        end !== null

      if (canUseRangeText) {
        input.setRangeText("~", 0, 0, "preserve")
      } else {
        setNativeInputValue(input, `~${value}`)
        input.setSelectionRange(start + 1, end + 1)
      }

      input.dispatchEvent(new Event("input", { bubbles: true }))
    } finally {
      queueMicrotask(() => {
        prefixingInputs.delete(input)
      })
    }
  }

  const handleInput = (e: Event) => {
    const input = findTradeSearchInput(e.target)
    if (!input) return
    const inputEvent = e as InputEvent
    if (inputEvent.isComposing) return
    ensureRegexPrefix(input, inputEvent.inputType)
  }

  document.addEventListener("input", handleInput, true)
  return () => document.removeEventListener("input", handleInput, true)
}
