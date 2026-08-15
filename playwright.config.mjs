import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "tests",
  testMatch: [
    "e2e/**/*.spec.mjs",
    "contracts/**/*.contract.spec.mjs"
  ],
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: "list"
})
