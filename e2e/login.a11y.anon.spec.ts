import { expect, test } from "@playwright/test";
import { expectAccessiblePage } from "./accessibility/axe";

test("login page meets WCAG 2.1 Level A and AA", async ({ page }) => {
  const route = "/login";

  await page.goto(route);

  await expectAccessiblePage({
    page,
    pageName: "Login page",
    route,
    ready: async () => {
      await expect(
        page.getByRole("heading", { name: "Sign in to the dashboard" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
    },
  });
});
