import assert from "node:assert/strict"
import { test } from "node:test"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { resolveReleaseCommand } = require("../scripts/release-command.cjs")

test("uses cmd for a Windows pnpm executable", () => {
  const invocation = resolveReleaseCommand({
    command: "pnpm",
    args: ["run", "data:refresh"],
    npmExecPath: "C:\\pnpm\\pnpm.exe",
    platform: "win32",
    comSpec: "C:\\Windows\\System32\\cmd.exe",
    nodePath: "C:\\node\\node.exe"
  })

  assert.deepEqual(invocation, {
    executable: "C:\\Windows\\System32\\cmd.exe",
    args: ["/d", "/s", "/c", "pnpm run data:refresh"]
  })
})

test("uses Node for a JavaScript package-manager CLI", () => {
  const invocation = resolveReleaseCommand({
    command: "pnpm",
    args: ["run", "test"],
    npmExecPath: "/opt/pnpm/bin/pnpm.cjs",
    platform: "linux",
    comSpec: undefined,
    nodePath: "/usr/bin/node"
  })

  assert.deepEqual(invocation, {
    executable: "/usr/bin/node",
    args: ["/opt/pnpm/bin/pnpm.cjs", "run", "test"]
  })
})
