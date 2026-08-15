// Document-level delegation helpers shared by content features running in the
// MAIN world on the Trade site.

export const on = (
  type: string,
  selector: string,
  handler: Function,
  opts?: any
) => {
  document.addEventListener(
    type,
    (e: any) => {
      const el = e.target.closest(selector)
      if (!el) return
      handler.call(el, e, el)
    },
    opts
  )
}

export const onEnter = (selector: string, handler: Function) => {
  document.addEventListener("mouseover", (e: any) => {
    const el = e.target.closest(selector)
    if (!el) return
    const rt = e.relatedTarget
    if (rt && (rt === el || el.contains(rt))) return
    handler.call(el, e, el)
  })
}
