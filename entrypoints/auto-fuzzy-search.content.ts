import { tradeHosts } from "~/lib/config/trade-hosts"
import { storageService } from "~/lib/services/storage"
import { getPendingSyncValue } from "~/lib/services/sync-journal"

type FuzzySearchSettings = {
  autoFuzzySearch?: boolean
}

export default defineContentScript({
  matches: tradeHosts,
  runAt: "document_start",

  main() {
    const settingsKey = location.pathname.startsWith("/trade2/")
      ? "app-settings-poe2"
      : "app-settings-poe1"

    const apply = async () => {
      const settings =
        (await getPendingSyncValue<FuzzySearchSettings>(settingsKey)) ??
        (await storageService.getValue<FuzzySearchSettings>(
          settingsKey,
          null,
          "sync"
        )) ??
        (await storageService.getValue<FuzzySearchSettings>(settingsKey))
      // New installs and profiles without this setting keep the historical
      // behavior: fuzzy matching is on until explicitly disabled.
      document.documentElement.dataset.kroxAutoFuzzy =
        settings?.autoFuzzySearch === false ? "off" : "on"
    }

    void apply()
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync" && changes[settingsKey]) void apply()
    })
  }
})
