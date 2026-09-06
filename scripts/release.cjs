const childProcess = require("child_process")
const fs = require("fs")
const path = require("path")
const { resolveReleaseCommand } = require("./release-command.cjs")

const root = path.join(__dirname, "..")
const buildDir = path.join(root, "build")
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8")
)
const version = packageJson.version
const tag = `v${version}`
const branch = `release-${tag}`
const originRepository = "javijec/PoeTradePlus"
const upstreamRepository = "KroxiLabs/Kroxitrade"
const languages = [
  "en",
  "es",
  "pt",
  "ru",
  "th",
  "de",
  "fr",
  "ja",
  "ko",
  "zh-cn",
  "zh-tw"
]

const run = (command, args, options = {}) => {
  const { executable, args: commandArgs } = resolveReleaseCommand({
    command,
    args,
    npmExecPath: process.env.npm_execpath,
    platform: process.platform,
    comSpec: process.env.ComSpec,
    nodePath: process.execPath
  })
  const result = childProcess.spawnSync(executable, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  })
  if (result.status !== 0) {
    const spawnError = result.error ? `\n${result.error.message}` : ""
    const details = options.capture
      ? `${spawnError}\n${result.stderr || result.stdout || ""}`
      : spawnError
    throw new Error(`${command} ${args.join(" ")} failed.${details}`)
  }
  return (result.stdout || "").trim()
}

const loadTypeScriptModule = (relativePath) => {
  const modulePath = path.join(root, relativePath)
  const loader = `process.stdout.write(JSON.stringify(require(${JSON.stringify(modulePath)})))`
  const result = childProcess.spawnSync(
    process.execPath,
    ["--experimental-strip-types", "-e", loader],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }
  )

  if (result.status !== 0) {
    throw new Error(
      `Unable to load ${relativePath} with Node's TypeScript type stripping.\n${result.stderr || result.error?.message || ""}`
    )
  }

  try {
    return JSON.parse(result.stdout)
  } catch (error) {
    throw new Error(
      `Unable to parse exports from ${relativePath}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

const resolveText = (item, englishTranslations, field) => {
  const key = item[`${field}Key`]
  if (key) return englishTranslations[key] || key
  return item[field] || ""
}

const assertReleaseNotes = () => {
  const { latestWhatsNew } = loadTypeScriptModule("lib/data/whats-new.ts")
  const { englishTranslations } = loadTypeScriptModule("lib/services/i18n/en.ts")
  const { localizedWhatsNewTexts } = loadTypeScriptModule(
    "lib/data/whats-new-translations.ts"
  )

  if (latestWhatsNew.version !== version) {
    throw new Error(
      `What's New is ${latestWhatsNew.version}; package.json is ${version}. Update What's New before releasing.`
    )
  }

  const items = latestWhatsNew.sections.flatMap((section) =>
    section.groups
      ? section.groups.flatMap((group) => group.items)
      : section.items || []
  )
  if (items.length === 0) {
    throw new Error("What's New has no release items.")
  }

  for (const item of items) {
    for (const field of ["title", "description"]) {
      const text = resolveText(item, englishTranslations, field)
      if (!text) throw new Error(`What's New item is missing ${field}.`)

      if (item[`${field}Key`]) {
        for (const language of languages) {
          const localePath = path.join(root, "lib", "services", "i18n", `${language}.ts`)
          if (!fs.readFileSync(localePath, "utf8").includes(`"${item[`${field}Key`]}"`)) {
            throw new Error(`Missing ${language} translation for ${item[`${field}Key`]}.`)
          }
        }
      } else {
        for (const language of languages.filter((language) => language !== "en")) {
          // Chinese locales were added after these legacy, literal release notes.
          // New notes use translation keys and are still required in every locale.
          if (!localizedWhatsNewTexts[language]) continue
          if (!localizedWhatsNewTexts[language]?.[text]) {
            throw new Error(`Missing ${language} What's New translation for: ${text}`)
          }
        }
      }
    }
  }

  return { latestWhatsNew, englishTranslations }
}

const releaseNotesPath = () => path.join(buildDir, `release-notes-${tag}.md`)
const sourceArchivePath = () =>
  path.join(buildDir, `${packageJson.name}-${version}-sources.zip`)
const assetPaths = () => [
  path.join(buildDir, `${packageJson.name}-${version}-chrome.zip`),
  path.join(buildDir, `${packageJson.name}-${version}-firefox.zip`),
  sourceArchivePath()
]

const writeReleaseNotes = ({ latestWhatsNew, englishTranslations }) => {
  const lines = [`# ${tag}`, ""]
  for (const section of latestWhatsNew.sections) {
    lines.push(`## ${section.title || englishTranslations[section.titleKey] || section.titleKey}`)
    const groups = section.groups || [{ titleKey: "", items: section.items || [] }]
    for (const group of groups) {
      if (group.titleKey) lines.push(`### ${englishTranslations[group.titleKey] || group.titleKey}`)
      for (const item of group.items) {
        const title = resolveText(item, englishTranslations, "title")
        const description = resolveText(item, englishTranslations, "description")
        lines.push(`- **${title}**${description ? ` — ${description}` : ""}`)
      }
      lines.push("")
    }
  }
  fs.mkdirSync(buildDir, { recursive: true })
  fs.writeFileSync(releaseNotesPath(), `${lines.join("\n").trim()}\n`)
}

const ensureCleanOrCommit = () => {
  const status = run("git", ["status", "--porcelain"], { capture: true })
  if (!status) return
  run("git", ["add", "--all"])
  run("git", ["commit", "-m", `release: ${tag}`])
}

const assertCleanWorkingTree = () => {
  const status = run("git", ["status", "--porcelain"], { capture: true })
  if (status) {
    throw new Error("Commit or stash local changes before publishing a release.")
  }
}

const prepare = () => {
  const releaseData = assertReleaseNotes()
  const currentBranch = run("git", ["branch", "--show-current"], { capture: true })
  if (currentBranch === "main") {
    run("git", ["switch", "-c", branch])
  } else if (currentBranch !== branch) {
    throw new Error(`Switch to main or ${branch} before preparing a release.`)
  }

  ensureCleanOrCommit()
  writeReleaseNotes(releaseData)
  const packageOutput = run("pnpm", ["run", "package"], { capture: true })
  process.stdout.write(`${packageOutput}\n`)

  for (const assetPath of assetPaths()) {
    if (!fs.existsSync(assetPath)) throw new Error(`Missing release asset: ${assetPath}`)
  }

  run("git", ["push", "--set-upstream", "origin", branch])
  run("gh", ["auth", "status"])

  const head = `javijec:${branch}`
  const existingPr = run(
    "gh",
    [
      "api",
      `repos/${upstreamRepository}/pulls?head=${head}&state=open`,
      "--jq",
      ".[0].html_url"
    ],
    { capture: true }
  )
  const prUrl =
    existingPr ||
    run("gh", [
      "pr",
      "create",
      "--repo",
      upstreamRepository,
      "--base",
      "main",
      "--head",
      head,
      "--title",
      `Release ${tag}`,
      "--body-file",
      releaseNotesPath()
    ], { capture: true })

  console.log(`Prepared ${tag}. Upstream PR: ${prUrl}`)
  console.log(`After merge: pnpm run release:publish -- ${branch}`)
}

const publish = () => {
  const releaseData = assertReleaseNotes()
  assertCleanWorkingTree()
  const releaseBranch = process.argv.slice(3).find((argument) => argument !== "--")
  if (!releaseBranch) {
    throw new Error("Pass merged release branch: pnpm run release:publish -- release-vX.Y.Z")
  }
  for (const assetPath of assetPaths()) {
    if (!fs.existsSync(assetPath)) throw new Error(`Missing release asset: ${assetPath}. Run release:prepare again.`)
  }
  writeReleaseNotes(releaseData)
  const head = `javijec:${releaseBranch}`
  const mergedAt = run(
    "gh",
    [
      "api",
      "--method",
      "GET",
      `repos/${upstreamRepository}/pulls`,
      "-f",
      "state=closed",
      "-f",
      `head=${head}`,
      "-f",
      "per_page=100",
      "--jq",
      "map(select(.merged_at != null)) | .[0].merged_at"
    ],
    { capture: true }
  )
  if (!mergedAt) throw new Error(`Upstream PR for ${head} is not merged.`)

  const releaseArgs = ["release", "create", tag, ...assetPaths(), "--title", tag, "--notes-file", releaseNotesPath()]
  run("gh", [...releaseArgs, "--repo", originRepository])
  run("gh", [...releaseArgs, "--repo", upstreamRepository])

  const currentBranch = run("git", ["branch", "--show-current"], {
    capture: true
  })
  const localBranch = run("git", ["branch", "--list", releaseBranch], {
    capture: true
  })
  if (currentBranch === releaseBranch) run("git", ["switch", "main"])

  const remoteBranch = run(
    "git",
    ["ls-remote", "--heads", "origin", releaseBranch],
    { capture: true }
  )
  if (remoteBranch) run("git", ["push", "origin", "--delete", releaseBranch])
  if (localBranch) run("git", ["branch", "-D", releaseBranch])

  run("git", ["fetch", "upstream", "main"])
  run("git", ["switch", "main"])
  run("git", ["merge", "--ff-only", "upstream/main"])
  run("git", ["push", "origin", "main"])
  run("pnpm", ["run", "version"])

  console.log(`Published ${tag} to ${originRepository} and ${upstreamRepository}.`)
  console.log(`Deleted release branch: ${releaseBranch}`)
  console.log("Synchronized main with upstream and bumped the next patch version.")
}

const action = process.argv[2]
if (action === "check") {
  run("pnpm", ["run", "data:refresh"])
  run("pnpm", ["run", "typecheck"])
  run("pnpm", ["run", "test"])
  run("pnpm", ["run", "check:bundle"])
  run("pnpm", ["run", "test:e2e"])
  run("pnpm", ["run", "build:firefox"])
  const releaseData = assertReleaseNotes()
  writeReleaseNotes(releaseData)
  console.log(`What's New for ${tag} is complete. Changelog: ${releaseNotesPath()}`)
} else if (action === "prepare") prepare()
else if (action === "publish") publish()
else throw new Error("Use: node scripts/release.cjs <prepare|publish>")
