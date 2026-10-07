import { expect, test } from "@playwright/test";
import { stubDashboardResponses } from "./accessibility/dashboardData";
import {
  closeColumnPicker,
  columnPicker,
  DEFAULT_COLUMNS,
  HIDDEN_BY_DEFAULT_COLUMNS,
  hideColumns,
  openColumnPicker,
  showColumns,
  transactionLogHeaders,
} from "./transactionColumns";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("grid", { name: /Transaction log/ }),
  ).toBeVisible();
});

test("the log opens showing only the default columns", async ({ page }) => {
  await expect.poll(() => transactionLogHeaders(page)).toEqual(DEFAULT_COLUMNS);
});

test("checking a column shows it and unchecking hides it", async ({ page }) => {
  await showColumns(page, "Created");
  await expect
    .poll(() => transactionLogHeaders(page))
    .toEqual(["Created", ...DEFAULT_COLUMNS]);

  await hideColumns(page, "Amount");
  await expect
    .poll(() => transactionLogHeaders(page))
    .toEqual(["Created", "Last updated", "Fee", "Payment status"]);
});

test("Reset to defaults restores the default columns", async ({ page }) => {
  await showColumns(page, "Client", "Docket number");

  await openColumnPicker(page);
  await columnPicker(page)
    .getByRole("button", { name: "Reset to defaults" })
    .click();
  await expect(
    columnPicker(page).getByRole("button", { name: "Reset to defaults" }),
  ).toBeDisabled();
  await closeColumnPicker(page);

  await expect.poll(() => transactionLogHeaders(page)).toEqual(DEFAULT_COLUMNS);
});

test("the last visible column cannot be hidden", async ({ page }) => {
  await hideColumns(page, "Last updated", "Fee", "Amount");

  await openColumnPicker(page);
  await expect(
    columnPicker(page).getByRole("checkbox", {
      name: "Payment status",
      exact: true,
    }),
  ).toBeDisabled();
});

test("the chosen columns are not kept in the url and reset on reload", async ({
  page,
}) => {
  const urlBefore = page.url();

  await showColumns(page, "Client");
  await expect(page).toHaveURL(urlBefore);

  await page.reload();

  await expect.poll(() => transactionLogHeaders(page)).toEqual(DEFAULT_COLUMNS);
});

test("the picker works from the keyboard", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Select columns" });

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(columnPicker(page)).toBeVisible();

  const created = columnPicker(page).getByRole("checkbox", {
    name: "Created",
    exact: true,
  });
  await created.focus();
  await page.keyboard.press("Space");
  await expect(created).toBeChecked();

  await page.keyboard.press("Escape");
  await expect(columnPicker(page)).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect
    .poll(() => transactionLogHeaders(page))
    .toEqual(["Created", ...DEFAULT_COLUMNS]);
});

test("with every column shown the log scrolls sideways instead of squeezing", async ({
  page,
}) => {
  await stubDashboardResponses(page);
  await page.reload();
  await expect(
    page
      .getByRole("grid", { name: /Transaction log/ })
      .getByRole("gridcell")
      .first(),
  ).toBeVisible();

  await showColumns(page, ...HIDDEN_BY_DEFAULT_COLUMNS);

  await expect
    .poll(() => transactionLogHeaders(page))
    .toHaveLength(DEFAULT_COLUMNS.length + HIDDEN_BY_DEFAULT_COLUMNS.length);

  const overflows = await page
    .getByTestId("transaction-table-scroll")
    .filter({ visible: true })
    .evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(overflows).toBe(true);
});

test("a filter shows the column it searches by and the admin can still hide it", async ({
  page,
}) => {
  await page.goto("/?transactionStatus=cancelled");

  await expect
    .poll(() => transactionLogHeaders(page))
    .toEqual([...DEFAULT_COLUMNS, "Transaction status"]);

  await openColumnPicker(page);
  const transactionStatus = columnPicker(page).getByRole("checkbox", {
    name: "Transaction status",
    exact: true,
  });
  await expect(transactionStatus).toBeChecked();
  await expect(transactionStatus).toBeEnabled();
  await closeColumnPicker(page);

  await hideColumns(page, "Transaction status");

  await expect
    .poll(() => transactionLogHeaders(page))
    .toEqual(DEFAULT_COLUMNS);
});

test("on a short window the picker stays clear of the neighboring header buttons", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 360 });
  const trigger = page.getByRole("button", { name: "Select columns" });
  await trigger.evaluate((el) => el.scrollIntoView({ block: "center" }));

  await openColumnPicker(page);
  await columnPicker(page).evaluate((el) =>
    Promise.all(el.getAnimations().map((animation) => animation.finished)),
  );

  const picker = await columnPicker(page).boundingBox();
  expect(picker).not.toBeNull();
  for (const name of ["Copy share link", "Download report"]) {
    const button = await page.getByRole("button", { name }).boundingBox();
    expect(button).not.toBeNull();
    if (!picker || !button) return;
    const overlaps =
      picker.x < button.x + button.width &&
      button.x < picker.x + picker.width &&
      picker.y < button.y + button.height &&
      button.y < picker.y + picker.height;
    expect(overlaps, `picker covers ${name}`).toBe(false);
  }
  expect(picker?.height ?? 0).toBeLessThanOrEqual(360);
});
