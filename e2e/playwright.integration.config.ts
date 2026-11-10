import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL;

if (!BASE_URL) {
  throw new Error(
    "E2E_BASE_URL is required for integration tests and must point to a deployed dashboard.",
  );
}

export const INTEGRATION_STORAGE_STATE =
  process.env.E2E_STORAGE_STATE ??
  path.join(__dirname, ".auth/integration.json");

const storageState = process.env.E2E_STORAGE_STATE_JSON
  ? JSON.parse(process.env.E2E_STORAGE_STATE_JSON)
  : INTEGRATION_STORAGE_STATE;

const BROWSER_CHANNEL = process.env.E2E_CHANNEL ?? "msedge";

export default defineConfig({
  testDir: __dirname,
  testMatch: ["**/*.integration.spec.ts", "**/integration.auth.setup.ts"],
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: path.join(__dirname, "integration-report"),
      },
    ],
  ],
  outputDir: path.join(__dirname, "integration-results"),
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1200 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "integration-auth",
      testMatch: /integration\.auth\.setup\.ts$/,
      use: { ...devices["Desktop Edge"], channel: BROWSER_CHANNEL },
    },
    {
      name: "integration",
      testMatch: /.*\.integration\.spec\.ts$/,
      testIgnore: /.*\.error\.integration\.spec\.ts$/,
      use: {
        ...devices["Desktop Edge"],
        channel: BROWSER_CHANNEL,
        storageState,
      },
    },
    {
      name: "integration-error",
      testMatch: /.*\.error\.integration\.spec\.ts$/,
      use: {
        ...devices["Desktop Edge"],
        channel: BROWSER_CHANNEL,
        baseURL: process.env.E2E_ERROR_BASE_URL ?? BASE_URL,
        storageState,
      },
    },
  ],
});
