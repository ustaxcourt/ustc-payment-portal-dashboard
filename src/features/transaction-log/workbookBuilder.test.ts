import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { TransactionLogEntry } from "./types";
import { buildWorkbook } from "./workbookBuilder";

const row = (id: number): TransactionLogEntry => ({
  agencyTrackingId: `agency-${id}`,
  feeName: "Filing Fee",
  fee: "PETITION_FILING_FEE",
  transactionAmount: 60.5,
  clientName: "payment-portal",
  transactionReferenceId: `ref-${id}`,
  paymentStatus: "success",
  transactionStatus: "settled",
  paymentMethod: "Credit/Debit Card",
  createdAt: "2026-08-17T12:00:00.000Z",
  lastUpdatedAt: "2026-08-17T13:00:00.000Z",
});

describe("buildWorkbook", () => {
  it("produces a readable workbook with typed cells and table furniture", async () => {
    const buffer = await buildWorkbook([row(1), row(2)], "success");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Transactions");
    if (!sheet) throw new Error("Transactions sheet missing");

    expect(sheet.rowCount).toBe(3);
    expect(sheet.getCell("A1").value).toBe("Created date (ET)");
    // Success tab: no Failure reason, 11 columns ending in Reference ID.
    expect(sheet.getCell("K1").value).toBe("Reference ID");
    expect(sheet.getCell("L1").value).toBeNull();

    const amount = sheet.getRow(2).getCell(6);
    expect(amount.value).toBe(60.5);
    expect(amount.numFmt).toBe('"$"#,##0.00');

    expect(sheet.getRow(2).getCell(1).value).toBeInstanceOf(Date);
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(sheet.autoFilter).toBeTruthy();
  });

  it("returns a transferable ArrayBuffer", async () => {
    const buffer = await buildWorkbook([row(1)], "all");
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
