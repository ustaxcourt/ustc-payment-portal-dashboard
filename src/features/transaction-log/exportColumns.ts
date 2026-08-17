import { formatCourtStamp, formatLabel } from "@/lib/format";
import { TAB_LABEL } from "./statusStyles";
import type { TransactionLogEntry, TransactionTab } from "./types";

export type ExportCell = string | number | Date;

export type ExportColumn = {
  header: string;
  width: number;
  numFmt?: string;
  value: (row: TransactionLogEntry) => ExportCell;
};

/** Excel stores a time of day as a fraction of a day. */
const timeFraction = (time: string): number => {
  const [hours = 0, minutes = 0, seconds = 0] = time.split(":").map(Number);
  return (hours * 3600 + minutes * 60 + seconds) / 86400;
};

/** Midnight UTC of the Court-time calendar day, so Excel shows the ET date. */
const courtDateCell = (iso: string): ExportCell => {
  const stamp = formatCourtStamp(iso);
  return stamp.date === "—" ? "" : new Date(`${stamp.date}T00:00:00Z`);
};

const courtTimeCell = (iso: string): ExportCell => {
  const stamp = formatCourtStamp(iso);
  return stamp.time === "" ? "" : timeFraction(stamp.time);
};

const BASE_COLUMNS: ExportColumn[] = [
  {
    header: "Created date (ET)",
    width: 12,
    numFmt: "yyyy-mm-dd",
    value: (row) => courtDateCell(row.createdAt),
  },
  {
    header: "Created time (ET)",
    width: 10,
    numFmt: "hh:mm:ss",
    value: (row) => courtTimeCell(row.createdAt),
  },
  {
    header: "Last updated date (ET)",
    width: 12,
    numFmt: "yyyy-mm-dd",
    value: (row) => courtDateCell(row.lastUpdatedAt),
  },
  {
    header: "Last updated time (ET)",
    width: 10,
    numFmt: "hh:mm:ss",
    value: (row) => courtTimeCell(row.lastUpdatedAt),
  },
  {
    header: "Fee type",
    width: 28,
    value: (row) => row.feeName,
  },
  {
    header: "Amount",
    width: 12,
    numFmt: '"$"#,##0.00',
    value: (row) => row.transactionAmount,
  },
  {
    header: "Payment method",
    width: 16,
    value: (row) => (row.paymentMethod ? formatLabel(row.paymentMethod) : ""),
  },
  {
    header: "Payment status",
    width: 14,
    value: (row) => TAB_LABEL[row.paymentStatus],
  },
  {
    header: "Transaction status",
    width: 18,
    value: (row) =>
      row.transactionStatus ? formatLabel(row.transactionStatus) : "",
  },
  {
    header: "Client",
    width: 24,
    value: (row) => row.clientName,
  },
  {
    header: "Reference ID",
    width: 38,
    value: (row) => row.transactionReferenceId,
  },
];

const FAILURE_REASON: ExportColumn = {
  header: "Failure reason",
  width: 40,
  value: (row) => row.returnDetail ?? "",
};

/** Matches the table: Failure reason appears after Payment status on the
 *  All and Failed tabs only. */
export const exportColumns = (tab: TransactionTab): ExportColumn[] =>
  tab === "failed" || tab === "all"
    ? [...BASE_COLUMNS.slice(0, 8), FAILURE_REASON, ...BASE_COLUMNS.slice(8)]
    : BASE_COLUMNS;
