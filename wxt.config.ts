import { resolve } from "node:path"

import { defineConfig } from "wxt"
import { tradeHostPermissions } from "./lib/config/trade-hosts"

const iconMap = {
  16: "/icon-16.png",
  32: "/icon-32.png",
  48: "/icon-48.png",
  128: "/icon-128.png"
}

const firefoxBinary = process.env.FIREFOX_BINARY
const useManualFirefoxRunner = process.env.WXT_FIREFOX_MANUAL === "1"
const isE2eBuild = process.env.POETRADEPLUS_E2E === "1"

export default defineConfig({
  modules: ["@wxt-dev/module-svelte"],
  srcDir: ".",
  outDir: isE2eBuild ? "build-e2e" : "build",
  manifestVersion: 3,
  webExt: {
    disabled: useManualFirefoxRunner,
    binaries: firefoxBinary
      ? {
          firefox: firefoxBinary
        }
      : undefined
  },
  svelte: {
    vite: {
      compilerOptions: {
        css: "injected",
        fragments: "tree"
      }
    }
  },
  manifest: ({ browser }) => ({
    name: "Poe Trade Plus",
    description:
      "Poe Trade Plus enhances the Path of Exile trade site with bookmarks, history and result tools.",
    permissions: ["storage", "tabs", "alarms"],
    host_permissions: [
      ...tradeHostPermissions,
      "https://pathofexile.com/*",
      "https://poe.ninja/*"
    ],
    icons: iconMap,
    action: {
      default_title: "Poe Trade Plus",
      default_icon: iconMap
    },
    browser_specific_settings:
      browser === "firefox"
        ? {
            gecko: {
              id: "poe-trade-plus@kroxilabs.com",
              data_collection_permissions: {
                required: ["none"]
              }
            }
          }
        : undefined
  }),
  vite: () => ({
    optimizeDeps: {
      entries: ["entrypoints/popup.html"]
    },
    resolve: {
      alias: {
        "~": resolve(__dirname),
        "~assets": resolve(__dirname, "assets"),
        "~components": resolve(__dirname, "components"),
        "~lib": resolve(__dirname, "lib")
      }
    }
  })
})
