import { expect, test } from "@playwright/test";

test("shows the failing live API request and a user-facing error", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_ERROR_BASE_URL,
    "Set E2E_ERROR_BASE_URL to a deployed dashboard whose backend is intentionally unavailable.",
  );

  const failedRequest = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return pathname.startsWith("/api/") && response.status() >= 400;
  });

  await page.goto("/");

  const response = await failedRequest;
  expect(
    response.status(),
    `${response.request().method()} ${response.url()} unexpectedly succeeded`,
  ).toBeGreaterThanOrEqual(400);
  await expect(
    page.getByText(
      /Could not load the (transaction log|revenue totals|payment breakdown)\./,
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
