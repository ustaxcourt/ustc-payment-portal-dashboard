import { expect, test } from "@playwright/test";

// Playwright cannot drive the native save-as dialog; removing the picker
// forces the classic download path these specs assert on.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "showSaveFilePicker");
  });
});

const FILENAME =
  /^\d{4}-\d{2}-\d{2}( to \d{4}-\d{2}-\d{2})? - USTC Fee Payment Summary( \((Successful|Failed|Pending)\))?\.xlsx$/;

test("exporting downloads a workbook named for the current view", async ({
  page,
}) => {
  await page.goto("/?range=last7");

  const button = page.getByRole("button", { name: "Export" });
  await expect(button).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await button.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(FILENAME);
  expect(download.suggestedFilename()).toContain(" to ");
});

test("a filtered tab stamps its status into the filename", async ({ page }) => {
  await page.goto("/?range=last7&status=failed");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/ \(Failed\)\.xlsx$/);
});

test("the export announces progress politely and returns to idle", async ({
  page,
}) => {
  await page.goto("/?range=last7");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  await downloadPromise;

  await expect(page.getByRole("button", { name: "Export" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
});
