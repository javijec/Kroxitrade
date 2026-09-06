const quoteCommandArg = (value) =>
  /[\s"]/u.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value

const isJavaScriptCli = (cliPath) => /\.[cm]?js$/iu.test(cliPath || "")

const resolveReleaseCommand = ({
  command,
  args,
  npmExecPath,
  platform,
  comSpec,
  nodePath
}) => {
  const isPackageManager = command === "npm" || command === "pnpm"
  const usePackageManagerCli =
    isPackageManager && !!npmExecPath && isJavaScriptCli(npmExecPath)
  const useWindowsPackageManagerShell =
    isPackageManager && !usePackageManagerCli && platform === "win32"

  if (usePackageManagerCli) {
    return { executable: nodePath, args: [npmExecPath, ...args] }
  }

  if (useWindowsPackageManagerShell) {
    return {
      executable: comSpec || "cmd.exe",
      args: ["/d", "/s", "/c", [command, ...args].map(quoteCommandArg).join(" ")]
    }
  }

  return { executable: command, args }
}

module.exports = { resolveReleaseCommand }
