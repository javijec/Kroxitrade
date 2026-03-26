<script lang="ts">
  import type { PlasmoCSConfig, PlasmoGetRootContainer, PlasmoGetStyle } from "plasmo"
  import Layout from "~components/Layout.svelte"
  import cssText from "data-text:~lib/styles/base.scss"
  import enhancementsCss from "data-text:~lib/styles/enhancements.scss"
  import { pageTitleService } from "~lib/services/page-title"
  import { itemResultsService } from "~lib/services/item-results"
  import { onMount } from "svelte"

  export let anchor: unknown

  const EXTENSION_WIDTH = "360px"
  const SHIFTED_ELEMENT_ATTRIBUTE = "data-bt-shifted"

  export const config: PlasmoCSConfig = {
    matches: ["https://www.pathofexile.com/trade*"]
  }

  export const getStyle: PlasmoGetStyle = () => {
    const style = document.createElement("style")
    style.textContent = cssText
    return style
  }

  export const getRootContainer: PlasmoGetRootContainer = async () => {
    const existingRoot = document.getElementById("better-trading-root")
    if (existingRoot) {
      return existingRoot
    }

    const root = document.createElement("div")
    root.id = "better-trading-root"
    root.style.position = "fixed"
    root.style.left = "0"
    root.style.top = "0"
    root.style.right = "auto"
    root.style.bottom = "0"
    root.style.width = EXTENSION_WIDTH
    root.style.minWidth = EXTENSION_WIDTH
    root.style.maxWidth = EXTENSION_WIDTH
    root.style.height = "100vh"
    root.style.minHeight = "100vh"
    root.style.margin = "0"
    root.style.padding = "0"
    root.style.overflow = "hidden"
    root.style.boxSizing = "border-box"
    root.style.zIndex = "2147483647"
    root.style.pointerEvents = "none"

    const mountTarget = document.body ?? document.documentElement
    mountTarget.prepend(root)

    return root
  }

  onMount(() => {
    if (!document.body) {
      return
    }

    const applyShift = (offset: string) => {
      const bodyChildren = Array.from(document.body.children) as HTMLElement[]

      bodyChildren.forEach((element) => {
        if (
          element.id === "better-trading-root" ||
          element.id.startsWith("plasmo-") ||
          element.tagName === "SCRIPT" ||
          element.tagName === "STYLE" ||
          element.tagName === "LINK"
        ) {
          return
        }

        element.style.marginLeft = offset
        element.style.transition = "margin-left 0.3s ease"
        element.setAttribute(SHIFTED_ELEMENT_ATTRIBUTE, "true")
      })
    }

    const clearShift = () => {
      const shiftedElements = document.querySelectorAll<HTMLElement>(`[${SHIFTED_ELEMENT_ATTRIBUTE}="true"]`)

      shiftedElements.forEach((element) => {
        element.style.marginLeft = ""
        element.style.transition = ""
        element.removeAttribute(SHIFTED_ELEMENT_ATTRIBUTE)
      })
    }

    clearShift()
    applyShift(EXTENSION_WIDTH)

    const styleEl = document.createElement("style")
    styleEl.id = "bt-enhancement-styles"
    styleEl.textContent = enhancementsCss
    document.head.appendChild(styleEl)

    pageTitleService.initialize()
    void itemResultsService.initialize()

    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>
      const isCollapsed = !!customEvent.detail
      clearShift()
      applyShift(isCollapsed ? "0" : EXTENSION_WIDTH)

      if (isCollapsed) {
        document.body.classList.add("bt-is-collapsed")
      } else {
        document.body.classList.remove("bt-is-collapsed")
      }
    }

    document.addEventListener("bt-collapse-toggle", handleToggle as EventListener)

    return () => {
      document.body.classList.remove("bt-is-collapsed")
      clearShift()
      document.removeEventListener("bt-collapse-toggle", handleToggle as EventListener)
      document.getElementById("bt-enhancement-styles")?.remove()
    }
  })
</script>

<Layout />
