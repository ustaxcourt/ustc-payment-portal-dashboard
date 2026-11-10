import { expect, test as setup } from "@playwright/test";
import { INTEGRATION_STORAGE_STATE } from "./playwright.integration.config";

setup("capture a real authenticated session", async ({ page }) => {
  setup.setTimeout(5 * 60_000);

  await page.goto("/");

  if (new URL(page.url()).pathname === "/login") {
    await page.getByRole("button", { name: /login/i }).click();
  }

  await expect(
    page.getByRole("heading", { name: "Case Services & Finance Dashboard" }),
  ).toBeVisible({ timeout: 5 * 60_000 });
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: INTEGRATION_STORAGE_STATE });
});
