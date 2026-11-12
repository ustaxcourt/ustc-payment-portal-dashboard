import path from "node:path";
import {
  type BrowserContextOptions,
  defineConfig,
  devices,
} from "@playwright/test";

const BASE_URL = process.env.NEXTAUTH_URL;

if (!BASE_URL) {
  throw new Error(
    "NEXTAUTH_URL is required for integration tests and must point to a deployed dashboard.",
  );
}

export const INTEGRATION_STORAGE_STATE =
  process.env.E2E_STORAGE_STATE ??
  path.join(__dirname, ".auth/integration.json");

type InlineStorageState = Exclude<
  BrowserContextOptions["storageState"],
  string | undefined
>;

const storageStateFor = (
  baseUrl: string,
): BrowserContextOptions["storageState"] => {
  if (!process.env.E2E_STORAGE_STATE_JSON) return INTEGRATION_STORAGE_STATE;

  const state = JSON.parse(
    process.env.E2E_STORAGE_STATE_JSON,
  ) as InlineStorageState;
  const target = new URL(baseUrl);

  return {
    ...state,
    cookies: state.cookies.map((cookie) =>
      /^(?:__Secure-)?next-auth\.session-token$/.test(cookie.name)
        ? {
            ...cookie,
            domain: target.hostname,
            secure: target.protocol === "https:",
          }
        : cookie,
    ),
  };
};

const storageState = storageStateFor(BASE_URL);

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
        storageState: storageStateFor(
          process.env.E2E_ERROR_BASE_URL ?? BASE_URL,
        ),
      },
    },
  ],
});
