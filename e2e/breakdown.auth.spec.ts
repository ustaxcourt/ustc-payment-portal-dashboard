import { expect, test } from "@playwright/test";

const TOTAL = /^Total: \$[\d,]+\.\d{2}$/;

// TODO: For PAY-467: PaymentBreakdownPane is pulled from the page pending its rework into a
// full-width header bar; re-enable once that story lands. Kept skipped
// (not deleted) since the assertions still describe the target behavior.
test.describe.skip("payment breakdown pane (pending header-bar rework)", () => {
  test("the breakdown shows a row per fee and a grand total", async ({
    page,
  }) => {
    await page.goto("/?range=last7");

    const pane = page.getByTestId("payment-breakdown-pane");
    await expect(
      pane.getByRole("heading", { name: "Payment Breakdown" }),
    ).toBeVisible();

    await expect(
      pane.getByRole("columnheader", { name: "Fee", exact: true }),
    ).toBeVisible();
    await expect(pane.getByRole("columnheader", { name: "Qty" })).toBeVisible();
    await expect(
      pane.getByRole("columnheader", { name: "Subtotal" }),
    ).toBeVisible();

    await expect(
      pane.getByRole("cell", { name: "Petition Filing Fee" }),
    ).toBeVisible();
    await expect(
      pane.getByRole("cell", { name: "Non-Attorney Exam Registration Fee" }),
    ).toBeVisible();

    await expect(page.getByTestId("payment-breakdown-total")).toHaveText(TOTAL);
  });

  test("the breakdown holds steady while the log is filtered by status", async ({
    page,
  }) => {
    await page.goto("/?range=last7");

    const total = page.getByTestId("payment-breakdown-total");
    await expect(total).toHaveText(TOTAL);
    const before = await total.textContent();

    const failedTab = page.getByRole("tab", { name: /Failed/ });
    await failedTab.click();
    await expect(failedTab).toHaveAttribute("aria-selected", "true");

    await expect(total).toHaveText(before ?? "");
  });
});
