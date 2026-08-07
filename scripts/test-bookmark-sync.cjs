const { build } = require("esbuild")
const { mkdtemp, rm } = require("node:fs/promises")
const { tmpdir } = require("node:os")
const { join } = require("node:path")
const { spawnSync } = require("node:child_process")

const run = async () => {
  const directory = await mkdtemp(
    join(tmpdir(), "poe-trade-plus-bookmark-sync-")
  )
  const output = join(directory, "bookmark-sync-recovery.test.mjs")

  try {
    await build({
      entryPoints: ["tests/bookmark-sync-recovery.test.mjs"],
      bundle: true,
      format: "esm",
      outfile: output,
      platform: "node"
    })
    const result = spawnSync(
      process.execPath,
      ["--no-warnings", "--test", output],
      {
        stdio: "inherit"
      }
    )
    process.exitCode = result.status ?? 1
  } finally {
    await rm(directory, { force: true, recursive: true })
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
