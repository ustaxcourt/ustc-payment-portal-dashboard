import { expect, type Page } from "@playwright/test";

export const DEFAULT_COLUMNS = [
  "Last updated",
  "Fee",
  "Amount",
  "Payment status",
];

export const HIDDEN_BY_DEFAULT_COLUMNS = [
  "Created",
  "Payment method",
  "Client",
  "Reference ID",
  "Pay.gov tracking ID",
  "Agency tracking ID",
  "Docket number",
  "Email",
  "Full name",
  "Access code",
];

export const columnPicker = (page: Page) =>
  page.getByRole("dialog", { name: "Select columns" });

export const openColumnPicker = async (page: Page) => {
  await page.getByRole("button", { name: "Select columns" }).click();
  await expect(columnPicker(page)).toBeVisible();
};

export const closeColumnPicker = async (page: Page) => {
  await page.keyboard.press("Escape");
  await expect(columnPicker(page)).toBeHidden();
};

const setColumns = async (page: Page, names: string[], visible: boolean) => {
  await openColumnPicker(page);
  for (const name of names) {
    await columnPicker(page)
      .getByRole("checkbox", { name, exact: true })
      .setChecked(visible);
  }
  await closeColumnPicker(page);
};

export const showColumns = (page: Page, ...names: string[]) =>
  setColumns(page, names, true);

export const hideColumns = (page: Page, ...names: string[]) =>
  setColumns(page, names, false);

export const transactionLogHeaders = async (page: Page) =>
  (
    await page
      .getByRole("grid", { name: /Transaction log/ })
      .getByRole("columnheader")
      .allTextContents()
  ).map((text) => text.trim());
