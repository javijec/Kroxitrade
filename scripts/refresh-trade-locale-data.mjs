import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { writeFileWithRetry } from "./file-write-retry.mjs"

const OUTPUT_DIRS = {
  poe1: resolve("data/trade-locales"),
  poe2: resolve("data/trade2-locales")
}
const ENDPOINTS = ["stats", "static", "filters", "items"]

// Every UI locale has a snapshot. Locales without their own official Trade
// host deliberately fall back to the English schema; zh-cn is generated from
// the traditional-Chinese source by the extension's local conversion layer.
const LOCALES = {
  en: "https://www.pathofexile.com",
  pt: "https://br.pathofexile.com",
  ru: "https://ru.pathofexile.com",
  th: "https://th.pathofexile.com",
  de: "https://de.pathofexile.com",
  fr: "https://fr.pathofexile.com",
  es: "https://es.pathofexile.com",
  ja: "https://jp.pathofexile.com",
  ko: "https://poe.kakaogames.com",
  "zh-tw": "https://pathofexile.tw"
}

const fetchOfficial = async (origin, endpoint, version) => {
  const response = await fetch(`${origin}/api/${version}/data/${endpoint}`, {
    headers: { "user-agent": "PoeTradePlus locale snapshot generator" }
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.json()
}

const writeSnapshot = async (outputDir, locale, origin, data, sourceLocale = locale) => {
  const snapshot = {
    format: 1,
    locale,
    sourceLocale,
    origin,
    generatedAt: new Date().toISOString(),
    data
  }
  await writeFileWithRetry(() =>
    writeFile(
      resolve(outputDir, `${locale}.json`),
      `${JSON.stringify(snapshot)}\n`,
      "utf8"
    )
  )
}

for (const [game, outputDir] of Object.entries(OUTPUT_DIRS)) {
  const version = game === "poe2" ? "trade2" : "trade"
  await mkdir(outputDir, { recursive: true })
  const snapshots = new Map()
  for (const [locale, origin] of Object.entries(LOCALES)) {
    try {
      const entries = await Promise.all(
        ENDPOINTS.map(async (endpoint) => [endpoint, await fetchOfficial(origin, endpoint, version)])
      )
      const data = Object.fromEntries(entries)
      snapshots.set(locale, { origin, data })
      await writeSnapshot(outputDir, locale, origin, data)
      console.log(`Updated ${game}/${locale}`)
    } catch (error) {
      console.warn(`Skipped ${game}/${locale}: ${error.message}`)
    }
  }

  // Simplified Chinese has no public international Trade host. Keep a local
  // snapshot with the same official Taiwan data; runtime conversion remains local.
  const tw = snapshots.get("zh-tw")
  if (tw) {
    await writeSnapshot(outputDir, "zh-cn", tw.origin, tw.data, "zh-tw")
    console.log(`Updated ${game}/zh-cn from zh-tw`)
  }
}
