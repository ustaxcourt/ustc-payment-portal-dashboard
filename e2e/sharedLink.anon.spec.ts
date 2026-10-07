import { expect, test } from "@playwright/test";

test.describe("a shared dashboard link", () => {
  test("keeps the filter and sort across sign-in", async ({ page }) => {
    await page.goto("/?status=failed&sort=transactionAmount&order=desc");

    await expect(page).toHaveURL(/\/login\?callbackUrl=/);

    const callback = decodeURIComponent(
      new URL(page.url()).searchParams.get("callbackUrl") ?? "",
    );
    expect(callback).toBe("/?status=failed&sort=transactionAmount&order=desc");
  });

  test("sends a plain visit to sign-in with nothing to return to", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("the sign-in page", () => {
  const hostile = [
    "https://evil.example",
    "http://evil.example/x",
    "//evil.example",
    "/\\evil.example",
  ];

  for (const candidate of hostile) {
    test(`refuses to return to ${candidate}`, async ({ page }) => {
      const submitted: string[] = [];

      await page.route("**/api/auth/signin/**", async (route) => {
        const post = route.request().postData() ?? "";
        const url = route.request().url();
        submitted.push(`${url}?${post}`);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ url: "/" }),
        });
      });

      await page.goto(`/login?callbackUrl=${encodeURIComponent(candidate)}`);
      await page.getByRole("button", { name: /login/i }).click();

      await expect
        .poll(() => submitted.length, { timeout: 10_000 })
        .toBeGreaterThan(0);

      expect(submitted.join("\n")).not.toContain("evil.example");
    });
  }
});
