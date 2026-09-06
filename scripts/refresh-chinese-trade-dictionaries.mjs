import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { writeFileWithRetry } from "./file-write-retry.mjs"

const SOURCE =
  "https://raw.githubusercontent.com/MooHuiDev/poe-zh-trade-tools-pro/main/data"
const OUTPUT_DIR = resolve("data/chinese-trade")
const FILES = ["stat-templates.json", "unique-names.json", "gem-names.json"]

const validate = (file, value) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${file} must contain a JSON object`)
  }
  if (typeof value.tw !== "object" || value.tw === null) {
    throw new Error(`${file} is missing its Traditional-Chinese dictionary`)
  }
  if (typeof value.cn !== "object" || value.cn === null) {
    throw new Error(`${file} is missing its Simplified-Chinese dictionary`)
  }
}

await mkdir(OUTPUT_DIR, { recursive: true })

for (const file of FILES) {
  const response = await fetch(`${SOURCE}/${file}`, {
    headers: { "user-agent": "PoeTradePlus dictionary snapshot generator" }
  })
  if (!response.ok) throw new Error(`${file}: ${response.status} ${response.statusText}`)

  const value = await response.json()
  validate(file, value)
  await writeFileWithRetry(() =>
    writeFile(resolve(OUTPUT_DIR, file), `${JSON.stringify(value)}\n`, "utf8")
  )
  console.log(`Updated local Poe Chinese dictionary: ${file}`)
}
