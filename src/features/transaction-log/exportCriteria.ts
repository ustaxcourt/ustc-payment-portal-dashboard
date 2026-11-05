import { formatLabel } from "@/lib/format";
import { COLUMN_LABEL } from "./columnLabels";
import { type AppliedDateRange, formatDateSpan } from "./dateRange";
import { PAYMENT_STATUS_LABEL } from "./statusStyles";
import { pairedMetadata } from "./transactionLogParams";
import {
  FEE_TYPE_LABEL,
  METADATA_KEY_LABEL,
  type TransactionSearchFilters,
  type TransactionSorting,
} from "./types";

export type ExportFilter = {
  name: string;
  /** Full value, for the workbook. */
  value: string;
  /** Short and free of user-typed text, for the filename. */
  descriptor: string;
};

/** The filters in force, most narrowing first, so a cap on the filename drops
 *  the least informative ones. */
export const activeExportFilters = (
  filters: TransactionSearchFilters,
): ExportFilter[] => {
  const active: ExportFilter[] = [];

  if (filters.paymentStatus) {
    const label = PAYMENT_STATUS_LABEL[filters.paymentStatus];
    active.push({ name: "Payment status", value: label, descriptor: label });
  }
  if (filters.feeType) {
    const label = FEE_TYPE_LABEL[filters.feeType];
    active.push({ name: "Fee", value: label, descriptor: label });
  }
  const metadata = pairedMetadata(filters);
  if (metadata) {
    const key = METADATA_KEY_LABEL[metadata.key];
    // The value can be an email, name or access code: never in a filename.
    active.push({
      name: "Metadata lookup",
      value: `${key}: ${metadata.value}`,
      descriptor: `${key} lookup`,
    });
  }
  if (filters.payType) {
    active.push({
      name: "Payment method",
      value: filters.payType,
      descriptor: filters.payType,
    });
  }
  if (filters.transactionStatus) {
    const label = formatLabel(filters.transactionStatus);
    active.push({
      name: "Transaction status",
      value: label,
      // Shares words with payment status ("Failed", "Pending").
      descriptor: `Transaction ${label}`,
    });
  }

  return active;
};

export type CriteriaRow = readonly [label: string, value: string];

/** Everything that decides which rows the file holds and in what order, as
 *  label/value pairs for the workbook's Export details sheet. The date range
 *  and sorting are always listed; filters only when applied. */
export const exportCriteriaRows = (
  range: AppliedDateRange,
  sorting: TransactionSorting,
  filters: TransactionSearchFilters,
): CriteriaRow[] => {
  const active = activeExportFilters(filters);

  return [
    ["Date range (ET)", formatDateSpan(range)],
    [
      "Sorted by",
      `${COLUMN_LABEL[sorting.sort]}, ${
        sorting.order === "desc" ? "descending" : "ascending"
      }`,
    ],
    ...active.map((filter) => [filter.name, filter.value] as const),
  ];
};
