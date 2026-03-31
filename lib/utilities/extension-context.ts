export const hasValidExtensionContext = () => {
  try {
    return typeof chrome !== "undefined" && !!chrome.runtime?.id
  } catch {
    return false
  }
}

export const isExtensionContextInvalidatedError = (error: unknown) => {
  return error instanceof Error && /Extension context invalidated/i.test(error.message)
}
