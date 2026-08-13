import { expect, test } from "@playwright/test";

test("the dashboard opens for a signed-in user", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Finance Dashboard" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
});

test("the log opens sorted by Created, descending", async ({ page }) => {
  await page.goto("/");

  const created = page.getByRole("columnheader", { name: /Created/ });
  await expect(created).toHaveAttribute("aria-sort", "descending");

  const amount = page.getByRole("columnheader", { name: /Amount/ });
  await expect(amount).toHaveAttribute("aria-sort", "none");
});

test("sorting a column puts it in the url and marks the header", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("columnheader", { name: /Amount/ })
    .getByRole("button", { name: "Amount" })
    .click();

  await expect(page).toHaveURL(/sort=transactionAmount/);
  await expect(
    page.getByRole("columnheader", { name: /Amount/ }),
  ).toHaveAttribute("aria-sort", "descending");

  await page
    .getByRole("columnheader", { name: /Amount/ })
    .getByRole("button", { name: "Amount" })
    .click();

  await expect(page).toHaveURL(/order=asc/);
  await expect(
    page.getByRole("columnheader", { name: /Amount/ }),
  ).toHaveAttribute("aria-sort", "ascending");
});

test("the headers are reachable and operable from the keyboard", async ({
  page,
}) => {
  await page.goto("/");

  const created = page
    .getByRole("columnheader", { name: /Created/ })
    .getByRole("button", { name: "Created" });

  await created.focus();
  await expect(created).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/sort=createdAt&order=asc|order=asc/);
});

test("a shared sorted link reproduces the same view", async ({ page }) => {
  await page.goto("/?status=failed&sort=clientName&order=asc");

  await expect(
    page.getByRole("columnheader", { name: /Client/ }),
  ).toHaveAttribute("aria-sort", "ascending");
  await expect(page.getByRole("tab", { name: /Failed/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
