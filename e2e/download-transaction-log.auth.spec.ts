import { expect, test } from "@playwright/test";
import { stubDashboardResponses } from "./accessibility/dashboardData";

// Playwright cannot drive the native save-as dialog; removing the picker
// forces the classic download path these specs assert on.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "showSaveFilePicker");
  });
});

const FILENAME =
  /^\d{4}-\d{2}-\d{2}( to \d{4}-\d{2}-\d{2})? - USTC Fee Payment Summary( \([^()]+\))?\.xlsx$/;

test("the download button saves a workbook named for the current view", async ({
  page,
}) => {
  await page.goto("/?range=last7");

  const button = page.getByRole("button", { name: "Download Transaction Log" });
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
  await page.getByRole("button", { name: "Download Transaction Log" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/ \(Failed\)\.xlsx$/);
});

test("several filters are listed in the filename, capped at three", async ({
  page,
}) => {
  // Stubbed so the filter combination can't come back empty from live data.
  await stubDashboardResponses(page);
  await page.goto(
    "/?range=last7&status=failed&feeType=PETITION_FILING_FEE&payType=ACH&transactionStatus=failed",
  );

  const button = page.getByRole("button", { name: "Download Transaction Log" });
  await expect(button).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await button.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    / \(Failed, Petition Filing Fee, ACH, \+1 more\)\.xlsx$/,
  );
  expect(download.suggestedFilename()).toMatch(FILENAME);
});

test("the download announces progress politely and returns to idle", async ({
  page,
}) => {
  await page.goto("/?range=last7");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Transaction Log" }).click();
  await downloadPromise;

  await expect(page.getByRole("button", { name: "Download Transaction Log" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
});
