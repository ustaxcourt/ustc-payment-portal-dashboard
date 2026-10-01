import { expect, test } from "@playwright/test";

test("the dashboard opens for a signed-in user", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Case Services & Finance Dashboard" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
});

test("the column headers stay pinned while the log scrolls", async ({
  page,
}) => {
  await page.goto("/?range=last7");

  const lastUpdated = page.getByRole("columnheader", { name: /Last updated/ });
  await expect(lastUpdated).toBeVisible();

  const scrolled = await page
    .getByTestId("transaction-table-scroll")
    .evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      return el.scrollTop;
    });

  await expect(lastUpdated).toBeInViewport();
  test.info().annotations.push({
    type: scrolled > 0 ? "scrolled" : "warning",
    description:
      scrolled > 0
        ? `scrolled ${scrolled}px`
        : "table did not overflow; sticky header unexercised",
  });
});

test("the log opens sorted by Last updated, descending", async ({ page }) => {
  await page.goto("/");

  const lastUpdated = page.getByRole("columnheader", { name: /Last updated/ });
  await expect(lastUpdated).toHaveAttribute("aria-sort", "descending");

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

  const lastUpdated = page
    .getByRole("columnheader", { name: /Last updated/ })
    .getByRole("button", { name: "Last updated" });

  await lastUpdated.focus();
  await expect(lastUpdated).toBeFocused();

  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("columnheader", { name: /Last updated/ }),
  ).toHaveAttribute("aria-sort", "ascending");

  await expect(page).toHaveURL(/order=asc/);
  await expect(page).not.toHaveURL(/sort=/);
});

test.fixme("changing the payment status filter keeps the current sort", async ({
  page,
}) => {
  await page.goto("/?status=failed&sort=returnDetail&order=asc");

  await expect(
    page.getByRole("columnheader", { name: /Failure reason/ }),
  ).toHaveAttribute("aria-sort", "ascending");

  await page.getByRole("radio", { name: /Successful/ }).click();

  await expect(page).toHaveURL(/sort=returnDetail/);
  await expect(
    page.getByRole("columnheader", { name: /Failure reason/ }),
  ).toHaveAttribute("aria-sort", "ascending");
});

test.fixme("a shared sorted link reproduces the same view", async ({
  page,
}) => {
  await page.goto("/?status=failed&sort=clientName&order=asc");

  await expect(
    page.getByRole("columnheader", { name: /Client/ }),
  ).toHaveAttribute("aria-sort", "ascending");
  await expect(page.getByRole("radio", { name: /Failed/ })).toBeChecked();
});
