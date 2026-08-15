// Generates tests/fixtures/trade-selectors.json from the typed selector
// modules so tests can consume the exact strings the extension uses without
// importing TypeScript at test runtime.
//
// Usage: node --experimental-strip-types scripts/export-trade-selectors.mjs

import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outputPath = join(root, "tests", "fixtures", "trade-selectors.json")

const common = await import("../lib/site-adapter/selectors/common.ts")
const poe1 = await import("../lib/site-adapter/selectors/poe1.ts")
const poe2 = await import("../lib/site-adapter/selectors/poe2.ts")

const serialize = (module) =>
  Object.fromEntries(
    Object.entries(module).filter(([key]) => key !== "default")
  )

const payload = {
  common: serialize(common),
  poe1: serialize(poe1),
  poe2: serialize(poe2)
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
console.log(`Wrote ${outputPath}`)
