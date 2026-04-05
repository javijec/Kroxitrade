const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const rootDir = path.join(__dirname, "..")
const packageJsonPath = path.join(rootDir, "package.json")
const buildDir = path.join(rootDir, "build")
const target = process.argv[2] || "chrome-mv3-prod"
const prodDir = path.join(buildDir, target)
const manifestPath = path.join(prodDir, "manifest.json")

if (!fs.existsSync(packageJsonPath)) {
  throw new Error("package.json not found")
}

if (!fs.existsSync(prodDir)) {
  throw new Error(`Production build folder not found: ${prodDir}`)
}

if (!fs.existsSync(manifestPath)) {
  throw new Error(`manifest.json not found in build output: ${manifestPath}`)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))

const criticalMissingFiles = new Set()
let prunedWebAccessibleResources = []

const addIfMissing = (relativePath) => {
  if (!relativePath || typeof relativePath !== "string") {
    return false
  }

  const normalizedPath = relativePath.replace(/^\.\//, "")
  const absolutePath = path.join(prodDir, normalizedPath)

  return !fs.existsSync(absolutePath) ? normalizedPath : false
}

for (const iconPath of Object.values(manifest.icons || {})) {
  const missingPath = addIfMissing(iconPath)
  if (missingPath) criticalMissingFiles.add(missingPath)
}

for (const iconPath of Object.values(manifest.action?.default_icon || {})) {
  const missingPath = addIfMissing(iconPath)
  if (missingPath) criticalMissingFiles.add(missingPath)
}

const missingPopup = addIfMissing(manifest.action?.default_popup)
if (missingPopup) criticalMissingFiles.add(missingPopup)

const missingWorker = addIfMissing(manifest.background?.service_worker)
if (missingWorker) criticalMissingFiles.add(missingWorker)

for (const script of manifest.content_scripts || []) {
  for (const jsFile of script.js || []) {
    const missingPath = addIfMissing(jsFile)
    if (missingPath) criticalMissingFiles.add(missingPath)
  }

  for (const cssFile of script.css || []) {
    const missingPath = addIfMissing(cssFile)
    if (missingPath) criticalMissingFiles.add(missingPath)
  }
}

for (const page of manifest.sandbox?.pages || []) {
  const missingPath = addIfMissing(page)
  if (missingPath) criticalMissingFiles.add(missingPath)
}

if (Array.isArray(manifest.web_accessible_resources)) {
  manifest.web_accessible_resources = manifest.web_accessible_resources
    .map((resourceGroup) => {
      const presentResources = []

      for (const resource of resourceGroup.resources || []) {
        const missingPath = addIfMissing(resource)

        if (missingPath) {
          prunedWebAccessibleResources.push(missingPath)
          continue
        }

        presentResources.push(resource)
      }

      return {
        ...resourceGroup,
        resources: presentResources
      }
    })
    .filter((resourceGroup) => resourceGroup.resources.length > 0)
}

if (criticalMissingFiles.size > 0) {
  throw new Error(
    `Build output is incomplete for ${target}. Missing required files referenced by manifest.json:\n- ${[...criticalMissingFiles].join("\n- ")}`
  )
}

if (prunedWebAccessibleResources.length > 0) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  console.warn(
    `Pruned ${prunedWebAccessibleResources.length} missing web_accessible_resources entries from manifest.json for ${target}.`
  )
  for (const resourcePath of prunedWebAccessibleResources) {
    console.warn(`- ${resourcePath}`)
  }
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
const displayName = String(packageJson.displayName || packageJson.name || "extension").trim()
const version = String(packageJson.version || "0.0.0").trim()
const safeName = displayName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, " ").trim()
const targetSuffix = target === "chrome-mv3-prod" ? "" : `-${target}`
const zipName = `${safeName}-${version}${targetSuffix}.zip`
const zipPath = path.join(buildDir, zipName)

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath)
}

const runArchive = (command, args) =>
  spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: false
  })

let result

if (process.platform === "win32") {
  const escapeForSingleQuotedPs = (value) => value.replace(/'/g, "''")

  const psScript = [
    "Add-Type -AssemblyName System.IO.Compression",
    "Add-Type -AssemblyName System.IO.Compression.FileSystem",
    `$source = '${escapeForSingleQuotedPs(prodDir)}'`,
    `$destination = '${escapeForSingleQuotedPs(zipPath)}'`,
    "if (Test-Path $destination) { Remove-Item $destination -Force }",
    "$files = Get-ChildItem -LiteralPath $source -Recurse -File",
    "$sourceRoot = [System.IO.Path]::GetFullPath($source)",
    "if (-not $sourceRoot.EndsWith([System.IO.Path]::DirectorySeparatorChar)) { $sourceRoot += [System.IO.Path]::DirectorySeparatorChar }",
    "$sourceUri = New-Object System.Uri($sourceRoot)",
    "$zip = [System.IO.Compression.ZipFile]::Open($destination, [System.IO.Compression.ZipArchiveMode]::Create)",
    "try {",
    "  foreach ($file in $files) {",
    "    $fileUri = New-Object System.Uri($file.FullName)",
    "    $relativePath = [System.Uri]::UnescapeDataString($sourceUri.MakeRelativeUri($fileUri).ToString())",
    "    $entryName = $relativePath -replace '\\\\', '/'",
    "    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName) | Out-Null",
    "  }",
    "} finally {",
    "  $zip.Dispose()",
    "}"
  ].join("; ")

  result = runArchive("powershell", ["-NoProfile", "-Command", psScript])
} else {
  result = runArchive("tar", ["-a", "-c", "-f", zipPath, "-C", prodDir, "."])
}

if (result.status !== 0) {
  throw new Error(`Failed to create archive: ${zipName}`)
}

console.log(`Created ${zipPath}`)
