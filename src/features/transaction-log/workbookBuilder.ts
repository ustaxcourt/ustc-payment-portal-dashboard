import ExcelJS from "exceljs";
import { exportColumns } from "./exportColumns";
import type { TransactionLogEntry, TransactionTab } from "./types";

export const buildWorkbook = async (
  rows: TransactionLogEntry[],
  tab: TransactionTab,
): Promise<ArrayBuffer> => {
  const columns = exportColumns(tab);

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

  // In the browser writeBuffer() resolves to a Buffer polyfill; only its
  // underlying ArrayBuffer can be transferred out of the worker.
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};
