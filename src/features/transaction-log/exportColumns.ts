import { formatCourtStamp, formatLabel } from "@/lib/format";
import { COLUMN_LABEL, metadataColumnId } from "./columnLabels";
import { PAYMENT_STATUS_LABEL } from "./statusStyles";
import { METADATA_KEYS, type TransactionLogEntry } from "./types";

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
    header: `${COLUMN_LABEL.createdAt} date (ET)`,
    width: 12,
    numFmt: "yyyy-mm-dd",
    value: (row) => courtDateCell(row.createdAt),
  },
  {
    header: `${COLUMN_LABEL.createdAt} time (ET)`,
    width: 10,
    numFmt: "hh:mm:ss",
    value: (row) => courtTimeCell(row.createdAt),
  },
  {
    header: `${COLUMN_LABEL.lastUpdatedAt} date (ET)`,
    width: 12,
    numFmt: "yyyy-mm-dd",
    value: (row) => courtDateCell(row.lastUpdatedAt),
  },
  {
    header: `${COLUMN_LABEL.lastUpdatedAt} time (ET)`,
    width: 10,
    numFmt: "hh:mm:ss",
    value: (row) => courtTimeCell(row.lastUpdatedAt),
  },
  {
    header: COLUMN_LABEL.feeName,
    width: 28,
    value: (row) => row.feeName,
  },
  {
    header: COLUMN_LABEL.transactionAmount,
    width: 12,
    numFmt: '"$"#,##0.00',
    value: (row) => row.transactionAmount,
  },
  {
    header: COLUMN_LABEL.paymentMethod,
    width: 16,
    value: (row) => (row.paymentMethod ? formatLabel(row.paymentMethod) : ""),
  },
  {
    header: COLUMN_LABEL.paymentStatus,
    width: 14,
    value: (row) => PAYMENT_STATUS_LABEL[row.paymentStatus],
  },
  {
    header: COLUMN_LABEL.transactionStatus,
    width: 18,
    value: (row) =>
      row.transactionStatus ? formatLabel(row.transactionStatus) : "",
  },
  {
    header: COLUMN_LABEL.clientName,
    width: 24,
    value: (row) => row.clientName,
  },
  {
    header: COLUMN_LABEL.transactionReferenceId,
    width: 38,
    value: (row) => row.transactionReferenceId,
  },
];

const FAILURE_REASON: ExportColumn = {
  header: COLUMN_LABEL.returnDetail,
  width: 40,
  value: (row) => row.returnDetail ?? "",
};

const TRACKING_ID_COLUMNS: ExportColumn[] = [
  {
    header: COLUMN_LABEL.paygovTrackingId,
    width: 24,
    value: (row) => row.paygovTrackingId ?? "",
  },
  {
    header: COLUMN_LABEL.agencyTrackingId,
    width: 24,
    value: (row) => row.agencyTrackingId,
  },
];

const METADATA_COLUMNS: ExportColumn[] = METADATA_KEYS.map((key) => ({
  header: COLUMN_LABEL[metadataColumnId(key)],
  width: 20,
  value: (row) => row.metadata?.[key] ?? "",
}));

/** Matches the table: Failure reason always appears right after Payment status. */
export const exportColumns = (): ExportColumn[] => [
  ...BASE_COLUMNS.slice(0, 8),
  FAILURE_REASON,
  ...BASE_COLUMNS.slice(8),
  ...TRACKING_ID_COLUMNS,
  ...METADATA_COLUMNS,
];
