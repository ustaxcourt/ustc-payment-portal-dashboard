import {
  type APIResponse,
  expect,
  type Page,
  type Response,
  test,
} from "@playwright/test";
import { projectedFees } from "../src/features/revenue-totals/projection";
import {
  TOTAL_PERIODS,
  type TotalsResponse,
} from "../src/features/revenue-totals/types";
import { formatCurrency, formatWholeCurrency } from "../src/lib/format";

type Transaction = {
  feeName: string;
  transactionAmount: number;
  paymentStatus: "success" | "failed" | "pending";
};

type TransactionResponse = {
  data: Transaction[];
  total: number;
  sort: string;
  order: "asc" | "desc";
};

const PAYMENT_STATUS_LABEL = {
  success: "Successful",
  failed: "Failed",
  pending: "Pending",
} as const;

const dashboardResponse = (page: Page, endpoint: string) =>
  page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === endpoint && response.request().method() === "GET";
  });

const expectSuccessfulApiResponse = async (
  response: APIResponse | Response,
  method = "GET",
) => {
  if (!response.ok()) {
    throw new Error(
      `${method} ${response.url()} failed with ${response.status()}: ${await response.text()}`,
    );
  }
  expect(response.status(), response.url()).toBeGreaterThanOrEqual(200);
  expect(response.status(), response.url()).toBeLessThan(300);
};

const expectTransactionsRendered = async (
  page: Page,
  response: TransactionResponse,
) => {
  expect(
    response.data.length,
    "The integration environment has no transactions",
  ).toBeGreaterThan(0);

  const rows = page
    .getByRole("grid", { name: /Transaction log/ })
    .getByRole("row");
  await expect(rows).toHaveCount(response.data.length + 1);
  await expect(rows.nth(1)).toContainText(response.data[0].feeName);

  const renderedRows = await rows.allTextContents();
  for (const [index, transaction] of response.data.entries()) {
    const rendered = renderedRows[index + 1];
    expect(rendered).toContain(transaction.feeName);
    expect(rendered).toContain(formatCurrency(transaction.transactionAmount));
    expect(rendered).toContain(PAYMENT_STATUS_LABEL[transaction.paymentStatus]);
  }
};

const expectTotalsRendered = async (page: Page, totals: TotalsResponse) => {
  const currentCells = page
    .getByRole("rowheader", { name: "Current Total" })
    .locator("..")
    .getByRole("cell");
  const trendCells = page
    .getByRole("rowheader", { name: /YoY Trend/ })
    .locator("..")
    .getByRole("cell");
  const projectedCells = page
    .getByRole("rowheader", { name: /Projected Total/ })
    .locator("..")
    .getByRole("cell");

  await expect(currentCells).toHaveCount(TOTAL_PERIODS.length);
  await expect(trendCells).toHaveCount(TOTAL_PERIODS.length);
  await expect(projectedCells).toHaveCount(TOTAL_PERIODS.length);

  for (const [index, period] of TOTAL_PERIODS.entries()) {
    const current = totals.current[period];
    const trend = totals.yoyTrends[period];
    expect(Number.isFinite(current.total)).toBe(true);
    expect(Number.isFinite(trend.difference)).toBe(true);
    expect(Number.isFinite(trend.percentChange)).toBe(true);
    if (trend.difference === null || trend.percentChange === null) {
      throw new Error(`${period} YoY trend did not resolve to real numbers`);
    }

    await expect(currentCells.nth(index)).toHaveText(
      formatCurrency(current.total),
    );
    await expect(trendCells.nth(index)).toContainText(
      formatCurrency(Math.abs(trend.difference)),
    );
    await expect(trendCells.nth(index)).toContainText(
      `(${Math.round(Math.abs(trend.percentChange))}%)`,
    );
    await expect(projectedCells.nth(index)).toHaveText(
      formatWholeCurrency(projectedFees(period, current)),
    );
  }
};

test("loads authenticated dashboard data from live APIs", async ({ page }) => {
  const sessionResponse = await page.request.get("/api/auth/session");
  await expectSuccessfulApiResponse(sessionResponse);
  const session = (await sessionResponse.json()) as {
    user?: { email?: string | null };
  };
  expect(session.user?.email).toBeTruthy();

  const transactionsPromise = dashboardResponse(page, "/api/transactions");
  const totalsPromise = dashboardResponse(page, "/api/totals");

  await page.goto("/?range=last30");

  const [transactionsResponse, totalsResponse] = await Promise.all([
    transactionsPromise,
    totalsPromise,
  ]);
  await expectSuccessfulApiResponse(transactionsResponse);
  await expectSuccessfulApiResponse(totalsResponse);

  const transactions =
    (await transactionsResponse.json()) as TransactionResponse;
  const totals = (await totalsResponse.json()) as TotalsResponse;

  expect(Array.isArray(transactions.data)).toBe(true);
  expect(transactions.total).toBeGreaterThanOrEqual(transactions.data.length);

  await expect(
    page.getByRole("heading", { name: "Case Services & Finance Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: `Transaction Log (${transactions.total})`,
    }),
  ).toBeVisible();
  await expectTransactionsRendered(page, transactions);
  await expectTotalsRendered(page, totals);
});

test("sorts and filters using live transaction requests", async ({ page }) => {
  await page.goto("/?range=last30");
  await expect(page.getByRole("grid")).toBeVisible();

  const sortedResponsePromise = dashboardResponse(page, "/api/transactions");
  await page
    .getByRole("columnheader", { name: /Amount/ })
    .getByRole("button", { name: "Amount" })
    .click();
  const sortedResponse = await sortedResponsePromise;
  await expectSuccessfulApiResponse(sortedResponse);
  const sorted = (await sortedResponse.json()) as TransactionResponse;

  expect(sorted.sort).toBe("transactionAmount");
  expect(sorted.order).toBe("desc");
  for (let index = 1; index < sorted.data.length; index += 1) {
    expect(sorted.data[index - 1].transactionAmount).toBeGreaterThanOrEqual(
      sorted.data[index].transactionAmount,
    );
  }
  await expect(page).toHaveURL(/sort=transactionAmount/);
  await expect(
    page.getByRole("columnheader", { name: /Amount/ }),
  ).toHaveAttribute("aria-sort", "descending");
  await expectTransactionsRendered(page, sorted);

  const filteredResponsePromise = dashboardResponse(page, "/api/transactions");
  await page.getByRole("radio", { name: /Successful/ }).click();
  const filteredResponse = await filteredResponsePromise;
  await expectSuccessfulApiResponse(filteredResponse);
  const filtered = (await filteredResponse.json()) as TransactionResponse;

  expect(
    filtered.data.every(({ paymentStatus }) => paymentStatus === "success"),
  ).toBe(true);
  expect(filtered.sort).toBe("transactionAmount");
  expect(filtered.order).toBe("desc");
  await expect(page).toHaveURL(/status=success/);
  await expectTransactionsRendered(page, filtered);

  const sharedUrlResponsePromise = dashboardResponse(page, "/api/transactions");
  await page.reload();
  const sharedUrlResponse = await sharedUrlResponsePromise;
  await expectSuccessfulApiResponse(sharedUrlResponse);
  const sharedUrl = new URL(sharedUrlResponse.url());
  const sharedTransactions =
    (await sharedUrlResponse.json()) as TransactionResponse;
  expect(sharedUrl.searchParams.get("status")).toBe("success");
  expect(sharedUrl.searchParams.get("sort")).toBe("transactionAmount");
  expect(sharedUrl.searchParams.get("order")).toBe("desc");
  await expect(page.getByRole("radio", { name: /Successful/ })).toBeChecked();
  await expect(
    page.getByRole("columnheader", { name: /Amount/ }),
  ).toHaveAttribute("aria-sort", "descending");
  await expectTransactionsRendered(page, sharedTransactions);
});
