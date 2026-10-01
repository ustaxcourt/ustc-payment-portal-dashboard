import { expect, test } from "@playwright/test";
import { expectAccessiblePage } from "./accessibility/axe";
import { stubDashboardResponses } from "./accessibility/dashboardData";

// TODO: For PAY-467: Update for refactored Payment Breakdown Pane
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
          page.getByRole("heading", {
            name: "Case Services & Finance Dashboard",
          }),
        ).toBeVisible();

        await expect(
          page.getByRole("grid", { name: /Transaction log, All/i }),
        ).toBeVisible();

        await expect(
          page.getByRole("table", { name: /Revenue totals/i }),
        ).toBeVisible();

        await expect(
          page.getByRole("button", { name: "Download Transaction Log" }),
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
          page.getByRole("heading", {
            name: "Case Services & Finance Dashboard",
          }),
        ).toBeVisible();

        await expect(
          page.getByRole("grid", { name: /Transaction log, Failed/i }),
        ).toBeVisible();

        await expect(
          page.getByRole("table", { name: /Revenue totals/i }),
        ).toBeVisible();

        await expect(
          page.getByRole("button", { name: "Download Transaction Log" }),
        ).toBeEnabled();
      },
    });
  });

  test.describe("narrow layout", () => {
    test.use({ viewport: { width: 375, height: 800 } });

    test("the open filters drawer meets WCAG 2.1 Level A and AA", async ({
      page,
    }) => {
      const route = "/";

      await page.goto(route);

      await expectAccessiblePage({
        page,
        pageName: "Dashboard narrow filters drawer",
        route,
        ready: async () => {
          await expect(
            page.getByRole("heading", {
              name: "Case Services & Finance Dashboard",
            }),
          ).toBeVisible();

          await expect(
            page.getByRole("grid", { name: /Transaction log, All/i }),
          ).toBeVisible();

          await expect(
            page.getByRole("table", { name: /Revenue totals/i }),
          ).toBeVisible();

          await expect(
            page.getByRole("button", { name: "Export" }),
          ).toBeEnabled();

          await page.getByRole("button", { name: "Show filters" }).click();

          await expect(
            page.getByRole("heading", { name: "Filters" }),
          ).toBeVisible();

          await expect(
            page.getByRole("button", { name: "Close filters" }),
          ).toBeVisible();
        },
      });
    });
  });
});
