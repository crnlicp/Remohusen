import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: process.env.DOCUMENT_BROWSER_OUTPUT ?? "node_modules/.cache/document-browser-tests",
  workers: 1,
  timeout: 90000,
  use: {
    headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
});
