import {
  type APIResponse,
  expect,
  type Page,
  type Response,
  test,
} from "@playwright/test";

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

type TotalsResponse = {
  current: Record<string, { total: number }>;
  yoyTrends: Record<string, { percentChange: number | null }>;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

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
  expect(
    Object.values(totals.current).every(({ total }) => Number.isFinite(total)),
  ).toBe(true);
  expect(
    Object.values(totals.yoyTrends).every(
      ({ percentChange }) =>
        percentChange === null || Number.isFinite(percentChange),
    ),
  ).toBe(true);

  await expect(
    page.getByRole("heading", { name: "Case Services & Finance Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: `Transaction Log (${transactions.total})`,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("rowheader", { name: "Current Total" }).locator(".."),
  ).toContainText(/\$[\d,]+\.\d{2}/);
  await expect(
    page.getByRole("rowheader", { name: /YoY Trend/ }).locator(".."),
  ).toContainText(/-?[\d,.]+%/);
  await expect(
    page.getByRole("rowheader", { name: /Projected Total/ }).locator(".."),
  ).toContainText(/\$[\d,]+/);

  if (transactions.data[0]) {
    const firstRow = page.getByRole("grid").getByRole("row").nth(1);
    await expect(firstRow).toContainText(transactions.data[0].feeName);
    await expect(firstRow).toContainText(
      currency.format(transactions.data[0].transactionAmount),
    );
  }
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
  await expect(page).toHaveURL(/sort=transactionAmount/);
  await expect(
    page.getByRole("columnheader", { name: /Amount/ }),
  ).toHaveAttribute("aria-sort", "descending");

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

  const sharedUrlResponsePromise = dashboardResponse(page, "/api/transactions");
  await page.reload();
  const sharedUrlResponse = await sharedUrlResponsePromise;
  await expectSuccessfulApiResponse(sharedUrlResponse);
  const sharedUrl = new URL(sharedUrlResponse.url());
  expect(sharedUrl.searchParams.get("status")).toBe("success");
  expect(sharedUrl.searchParams.get("sort")).toBe("transactionAmount");
  expect(sharedUrl.searchParams.get("order")).toBe("desc");
  await expect(page.getByRole("radio", { name: /Successful/ })).toBeChecked();
  await expect(
    page.getByRole("columnheader", { name: /Amount/ }),
  ).toHaveAttribute("aria-sort", "descending");
});
