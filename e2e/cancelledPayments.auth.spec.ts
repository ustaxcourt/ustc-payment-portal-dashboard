import { expect, test } from "@playwright/test";

// Stubbed rather than seeded: a real cancelled row needs database access the dashboard has
// no business holding — it reaches the portal only over signed HTTP.

const CANCELLED_ROW = {
  agencyTrackingId: "SWPcancelled000000001",
  paygovTrackingId: null,
  feeName: "Petition Filing Fee",
  fee: "PETITION_FILING_FEE",
  transactionAmount: 60,
  clientName: "Dawson",
  transactionReferenceId: "e2e-cancelled-ref",
  transactionStatus: "cancelled",
  paymentStatus: "failed",
  paymentMethod: null,
  returnCode: null,
  returnDetail: null,
  createdAt: "2026-08-03T12:00:00.000Z",
  lastUpdatedAt: "2026-08-03T12:00:00.000Z",
  metadata: { docketNumber: "123-26" },
};

const stubbedLog = (rows: unknown[]) => ({
  data: rows,
  counts: { all: rows.length, success: 0, failed: rows.length, pending: 0 },
  from: "2026-08-01T04:00:00.000Z",
  to: "2026-08-04T04:00:00.000Z",
  page: 1,
  pageSize: 200,
  sort: "lastUpdatedAt",
  order: "desc",
  total: rows.length,
});

test.beforeEach(async ({ page }) => {
  await page.route("**/api/transactions**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stubbedLog([CANCELLED_ROW])),
    });
  });
});

test("a cancelled transaction reads Cancelled under the Failed tab", async ({
  page,
}) => {
  await page.goto("/?status=failed");

  await expect(
    page.getByRole("cell", { name: "Cancelled", exact: true }),
  ).toBeVisible();

  // Same row, or the assertion above could pass against an unrelated one.
  await expect(
    page.getByRole("cell", { name: CANCELLED_ROW.transactionReferenceId }),
  ).toBeVisible();
});

test("Cancelled is offered as a Transaction Status search filter", async ({
  page,
}) => {
  await page.goto("/?status=search");

  await page.getByLabel("Transaction Status").click();

  await expect(
    page.getByRole("option", { name: "Cancelled", exact: true }),
  ).toBeVisible();
});
