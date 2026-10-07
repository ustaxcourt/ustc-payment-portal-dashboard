import { expect, test } from "@playwright/test";

const AMOUNT = /\$[\d,]+\.\d{2}/;

test.describe("payment breakdown cards", () => {
  test("the breakdown leads with a total card, then a card per fee", async ({
    page,
  }) => {
    await page.goto("/?range=last7");

    const pane = page.getByTestId("payment-breakdown-pane");
    const cards = pane.getByRole("listitem");

    await expect(cards.first()).toContainText("Successful Payments");
    await expect(cards.first()).toContainText(AMOUNT);
    await expect(cards.first()).toContainText("Total");

    await expect(
      pane.getByRole("listitem").filter({ hasText: "Petition Filing Fee" }),
    ).toContainText(/\d+ transactions?/);
    await expect(
      pane
        .getByRole("listitem")
        .filter({ hasText: "Non-Attorney Exam Registration Fee" }),
    ).toBeVisible();
  });

  test("the breakdown holds steady while the log is filtered by status", async ({
    page,
  }) => {
    await page.goto("/?range=last7");

    const total = page.getByTestId("payment-breakdown-card-total");
    await expect(total).toContainText(AMOUNT);
    const before = await total.textContent();

    const failedRadio = page.getByRole("radio", { name: /Failed/ });
    await failedRadio.click();
    await expect(failedRadio).toBeChecked();

    await expect(total).toHaveText(before ?? "");
  });
});
