// Document-level delegation helpers shared by content features running in the
// MAIN world on the Trade site.

export const on = (
  type: string,
  selector: string,
  handler: Function,
  opts?: any
) => {
  const listener = (e: any) => {
    const el = e.target.closest(selector)
    if (!el) return
    handler.call(el, e, el)
  }
  document.addEventListener(type, listener, opts)
  return () => document.removeEventListener(type, listener, opts)
}

export const onEnter = (selector: string, handler: Function) => {
  const listener = (e: any) => {
    const el = e.target.closest(selector)
    if (!el) return
    const rt = e.relatedTarget
    if (rt && (rt === el || el.contains(rt))) return
    handler.call(el, e, el)
  }
  document.addEventListener("mouseover", listener)
  return () => document.removeEventListener("mouseover", listener)
}
