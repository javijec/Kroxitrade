// Refresh the trade site fixtures used by the contract tests.
//
// To use:
//   1. Open https://www.pathofexile.com/trade/search/Standard in Chrome
//   2. View source, save into tests/fixtures/source/poe1.html
//   3. Open https://www.pathofexile.com/trade2/search/poe2 in Chrome
//   4. View source, save into tests/fixtures/source/poe2.html
//   5. Run: pnpm trade:fixtures:update
//
// The script normalises the source HTML (drops scripts, styles, comments, idle
// attributes) and writes the result to tests/fixtures/{poe1,poe2}/trade-search.html.

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const sourceDir = join(root, "tests/fixtures/source")
const fixturesDir = join(root, "tests/fixtures")

const stripScripts = (html) =>
  html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
const stripStyles = (html) =>
  html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "")
const collapseWhitespace = (html) => html.replace(/\s+/g, " ").trim()

const normalize = (html) =>
  collapseWhitespace(stripComments(stripStyles(stripScripts(html))))

const updateFixture = (game, sourcePath) => {
  if (!existsSync(sourcePath)) {
    console.warn(`[${game}] Source not found: ${sourcePath}`)
    return false
  }
  const html = readFileSync(sourcePath, "utf8")
  const normalized = normalize(html)
  const targetPath = join(fixturesDir, game, "trade-search.html")
  writeFileSync(targetPath, normalized, "utf8")
  console.log(`[${game}] Wrote ${targetPath} (${normalized.length} bytes)`)
  return true
}

const ok1 = updateFixture("poe1", join(sourceDir, "poe1.html"))
const ok2 = updateFixture("poe2", join(sourceDir, "poe2.html"))

if (!ok1 || !ok2) {
  console.error("\nMissing source files. To refresh the fixtures:")
  console.error("  1. Save the PoE1 trade search page source as tests/fixtures/source/poe1.html")
  console.error("  2. Save the PoE2 trade search page source as tests/fixtures/source/poe2.html")
  console.error("  3. Run: pnpm trade:fixtures:update")
  process.exit(1)
}
