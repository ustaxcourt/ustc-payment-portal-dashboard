import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

export const STORAGE_STATE = path.join(__dirname, ".auth/session.json");

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const BROWSER_CHANNEL = process.env.E2E_CHANNEL ?? "msedge";

export default defineConfig({
  testDir: __dirname,
  testMatch: ["**/*.spec.ts", "**/*.setup.ts"],
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: path.join(__dirname, "report") }]],
  outputDir: path.join(__dirname, "results"),

  webServer: {
    command: "npm run build && npm run start",
    url: BASE_URL,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "true",
    timeout: 180_000,
  },

  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1200 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "anonymous",
      testMatch: /.*\.anon\.spec\.ts/,
      use: { ...devices["Desktop Edge"], channel: BROWSER_CHANNEL },
    },
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Edge"], channel: BROWSER_CHANNEL },
    },
    {
      name: "authenticated",
      testMatch: /.*\.auth\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Edge"],
        channel: BROWSER_CHANNEL,
        storageState: STORAGE_STATE,
      },
    },
  ],
});
