import { expect, test } from "@playwright/test";
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
  await showColumns(page, "Client", "Docket Number");

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
  await showColumns(page, ...HIDDEN_BY_DEFAULT_COLUMNS);

  await expect
    .poll(() => transactionLogHeaders(page))
    .toHaveLength(DEFAULT_COLUMNS.length + HIDDEN_BY_DEFAULT_COLUMNS.length);

  const overflows = await page
    .getByTestId("transaction-table-scroll")
    .evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(overflows).toBe(true);
});
