import { expect, test } from "@playwright/test";
import { expectAccessiblePage } from "./accessibility/axe";
import { stubDashboardResponses } from "./accessibility/dashboardData";

test.describe("dashboard accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await stubDashboardResponses(page);
  });

  test("default dashboard view meets WCAG 2.1 Level A and AA", async ({
    page,
  }) => {
    const route = "/";

    await page.goto(route);

    await expectAccessiblePage({
      page,
      pageName: "Dashboard default view",
      route,
      ready: async () => {
        await expect(
          page.getByRole("heading", { name: "Payment Portal" }),
        ).toBeVisible();
        await expect(
          page.getByRole("table", { name: /Transaction log, All/i }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Export" }),
        ).toBeEnabled();
      },
    });
  });

  test("failed transactions view meets WCAG 2.1 Level A and AA", async ({
    page,
  }) => {
    const route = "/?range=last7&status=failed&sort=clientName&order=asc";

    await page.goto(route);

    await expectAccessiblePage({
      page,
      pageName: "Dashboard failed transactions view",
      route,
      ready: async () => {
        await expect(
          page.getByRole("heading", { name: "Payment Portal" }),
        ).toBeVisible();
        await expect(page.getByRole("tab", { name: /Failed/ })).toHaveAttribute(
          "aria-selected",
          "true",
        );
        await expect(
          page.getByRole("table", { name: /Transaction log, Failed/i }),
        ).toBeVisible();
      },
    });
  });
});
