import { expect, test } from "@playwright/test";
import { expectAccessiblePage } from "./accessibility/axe";
import {
  stubDashboardResponses,
  stubMixedTrendTotals,
} from "./accessibility/dashboardData";

test.describe("revenue totals accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await stubDashboardResponses(page);
    await stubMixedTrendTotals(page);
  });

  test("trend tones (up, down, flat) meet WCAG 2.1 Level A and AA", async ({
    page,
  }) => {
    const route = "/";

    await page.goto(route);

    await expectAccessiblePage({
      page,
      pageName: "Dashboard revenue totals with mixed trends",
      route,
      ready: async () => {
        const totals = page.getByRole("table", { name: /Revenue totals/i });
        await expect(totals).toBeVisible();
        await expect(totals.getByText("▲").first()).toBeAttached();
        await expect(totals.getByText("▼").first()).toBeAttached();
        await expect(
          totals.getByRole("cell", { name: "$0.00 (0%)", exact: true }),
        ).toBeAttached();
      },
    });
  });
});
