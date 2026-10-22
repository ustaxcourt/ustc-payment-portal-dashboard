import ExcelJS from "exceljs";
import { exportColumns } from "./exportColumns";
import type { CriteriaRow } from "./exportCriteria";
import type { TransactionLogEntry } from "./types";

export const buildWorkbook = async (
  rows: TransactionLogEntry[],
  criteria: readonly CriteriaRow[],
): Promise<ArrayBuffer> => {
  const columns = exportColumns();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Transactions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = columns.map((column) => ({
    header: column.header,
    width: column.width,
    ...(column.numFmt && { style: { numFmt: column.numFmt } }),
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  for (const row of rows) {
    sheet.addRow(columns.map((column) => column.value(row)));
  }

  // After the data sheet, so the workbook still opens on the transactions.
  // An unfiltered export has nothing to record.
  if (criteria.length > 0) {
    const criteriaSheet = workbook.addWorksheet("Filters applied");
    criteriaSheet.columns = [
      { header: "Criteria", width: 20 },
      { header: "Value", width: 60 },
    ];
    criteriaSheet.getRow(1).font = { bold: true };
    for (const [label, value] of criteria) criteriaSheet.addRow([label, value]);
  }

  // In the browser writeBuffer() resolves to a Buffer polyfill; only its
  // underlying ArrayBuffer can be transferred out of the worker.
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};
