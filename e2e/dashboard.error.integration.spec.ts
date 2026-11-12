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
  const diagnostic = `${response.request().method()} ${response.url()} returned ${response.status()}: ${await response.text()}`;
  expect(
    response.status(),
    `${diagnostic}; expected a backend failure`,
  ).toBeGreaterThanOrEqual(400);
  await expect(
    page.getByText(
      /Could not load the (transaction log|revenue totals|payment breakdown)\./,
    ),
    diagnostic,
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try again" }),
    diagnostic,
  ).toBeVisible();
});
