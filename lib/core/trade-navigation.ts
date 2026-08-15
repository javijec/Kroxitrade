const NAVIGATION_EVENT = "krox:navigation"

const PATCHED_FLAG = "__kroxNavigationPatched__"

// The Trade site is a SPA that only changes the URL through the history API.
// History methods can only be wrapped in the MAIN world (an isolated-world
// content script patches its own copy of `history`, not the page's), so the
// wrapper dispatches a DOM CustomEvent that both worlds can observe: DOM
// events cross isolated/main world boundaries, unlike JS globals.
export const patchNavigationHistory = () => {
  if (typeof window === "undefined" || typeof history === "undefined") return

  const w = window as unknown as Record<string, unknown>
  if (w[PATCHED_FLAG]) return
  w[PATCHED_FLAG] = true

  const emit = () =>
    window.dispatchEvent(
      new CustomEvent(NAVIGATION_EVENT, { detail: window.location.href })
    )

  const patch = (method: "pushState" | "replaceState") => {
    const original = history[method]
    history[method] = function (
      data: unknown,
      unused: string,
      url?: string | URL | null
    ) {
      original.call(history, data, unused, url)
      emit()
    }
  }

  patch("pushState")
  patch("replaceState")
}

type NavigationListener = (url: string) => void

export const subscribeNavigation = (listener: NavigationListener) => {
  if (typeof window === "undefined") return () => {}

  // popstate covers back/forward; the CustomEvent covers pushState/replaceState
  // and is dispatched by the MAIN-world patch.
  const handler = () => listener(window.location.href)
  window.addEventListener("popstate", handler)
  window.addEventListener(NAVIGATION_EVENT, handler)

  return () => {
    window.removeEventListener("popstate", handler)
    window.removeEventListener(NAVIGATION_EVENT, handler)
  }
}
