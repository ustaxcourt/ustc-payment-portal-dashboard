import { formatCourtStamp, formatLabel } from "@/lib/format";
import { PAYMENT_STATUS_LABEL } from "./statusStyles";
import {
  METADATA_COLUMN_LABEL,
  METADATA_KEYS,
  TRACKING_ID_COLUMN_LABEL,
  type TransactionLogEntry,
} from "./types";

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
    header: "Fee",
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
    value: (row) => PAYMENT_STATUS_LABEL[row.paymentStatus],
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

/** Matches the table: Failure reason always appears right after Payment status. */
const TRACKING_ID_COLUMNS: ExportColumn[] = [
  {
    header: TRACKING_ID_COLUMN_LABEL.paygovTrackingId,
    width: 24,
    value: (row) => row.paygovTrackingId ?? "",
  },
  {
    header: TRACKING_ID_COLUMN_LABEL.agencyTrackingId,
    width: 24,
    value: (row) => row.agencyTrackingId,
  },
];

const METADATA_COLUMNS: ExportColumn[] = METADATA_KEYS.map((key) => ({
  header: METADATA_COLUMN_LABEL[key],
  width: 20,
  value: (row) => row.metadata?.[key] ?? "",
}));

export const exportColumns = (): ExportColumn[] => [
  ...BASE_COLUMNS.slice(0, 8),
  FAILURE_REASON,
  ...BASE_COLUMNS.slice(8),
  ...TRACKING_ID_COLUMNS,
  ...METADATA_COLUMNS,
];
