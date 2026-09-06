import assert from "node:assert/strict"
import { test } from "node:test"
import { writeFileWithRetry } from "../scripts/file-write-retry.mjs"

test("retries transient Windows file-write errors", async () => {
  let calls = 0

  await writeFileWithRetry(
    async () => {
      calls += 1
      if (calls < 3) {
        const error = new Error("file is temporarily unavailable")
        error.code = "UNKNOWN"
        throw error
      }
    },
    { attempts: 4, delayMs: 0 }
  )

  assert.equal(calls, 3)
})

test("does not retry non-transient file-write errors", async () => {
  const error = new Error("permission denied")
  error.code = "EACCES"
  let calls = 0

  await assert.rejects(
    () =>
      writeFileWithRetry(
        async () => {
          calls += 1
          throw error
        },
        { delayMs: 0 }
      ),
    error
  )

  assert.equal(calls, 1)
})
