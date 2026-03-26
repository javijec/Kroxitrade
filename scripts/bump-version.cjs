const fs = require("fs")
const path = require("path")

const packageJsonPath = path.join(__dirname, "..", "package.json")
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))

const versionParts = String(packageJson.version).split(".").map(Number)

if (versionParts.length !== 3 || versionParts.some((part) => Number.isNaN(part))) {
  throw new Error(`Unsupported version format: ${packageJson.version}`)
}

versionParts[2] += 1
packageJson.version = versionParts.join(".")

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n")

console.log(`Bumped version to ${packageJson.version}`)
