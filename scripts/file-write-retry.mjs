const RETRYABLE_WRITE_CODES = new Set(["EBUSY", "EPERM", "UNKNOWN"])

export const writeFileWithRetry = async (
  write,
  { attempts = 4, delayMs = 250 } = {}
) => {
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await write()
    } catch (error) {
      lastError = error
      const canRetry =
        RETRYABLE_WRITE_CODES.has(error?.code) && attempt < attempts
      if (!canRetry) throw error
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
    }
  }

  throw lastError
}
