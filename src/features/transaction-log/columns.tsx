"use client";

import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCourtStamp, formatCurrency, formatLabel } from "@/lib/format";
import SortableHeader from "./SortableHeader";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "./statusStyles";
import {
  FEE_METADATA_KEYS,
  type FeeType,
  METADATA_KEY_LABEL,
  type TransactionLogEntry,
  type TransactionSortField,
} from "./types";

export const COLUMN_LABEL: Record<TransactionSortField, string> = {
  createdAt: "Created",
  lastUpdatedAt: "Last updated",
  feeName: "Fee type",
  transactionAmount: "Amount",
  paymentMethod: "Payment method",
  paymentStatus: "Payment status",
  returnDetail: "Failure reason",
  transactionStatus: "Transaction status",
  clientName: "Client",
  transactionReferenceId: "Reference ID",
};

// Free-text fields (failure reason, client name, reference id) have no
// bounded length — without a cap, one long value stretches the whole
// column (and the table) far past the viewport instead of just that cell.
const truncated = (text: string, maxWidthClass: string, className?: string) => (
  <span
    className={`block ${maxWidthClass} truncate ${className ?? ""}`}
    title={text}
  >
    {text}
  </span>
);

const sortable = ({ column }: HeaderContext<TransactionLogEntry, unknown>) => (
  <SortableHeader
    label={COLUMN_LABEL[column.id as TransactionSortField]}
    sorted={column.getIsSorted()}
    onToggle={() => column.toggleSorting()}
  />
);

const BASE_COLUMNS: ColumnDef<TransactionLogEntry>[] = [
  {
    accessorKey: "createdAt",
    header: sortable,
    sortDescFirst: true,
    cell: ({ row }) => {
      const stamp = formatCourtStamp(row.original.createdAt);
      return (
        <div className="leading-tight">
          <div>{stamp.date}</div>
          <div className="text-muted-foreground">{stamp.time}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "lastUpdatedAt",
    header: sortable,
    sortDescFirst: true,
    cell: ({ row }) => {
      const stamp = formatCourtStamp(row.original.lastUpdatedAt);
      return (
        <div className="leading-tight">
          <div>{stamp.date}</div>
          <div className="text-muted-foreground">{stamp.time}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "feeName",
    header: sortable,
  },
  {
    accessorKey: "transactionAmount",
    header: sortable,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.transactionAmount)}
      </span>
    ),
  },
  {
    accessorKey: "paymentMethod",
    header: sortable,
    cell: ({ row }) => formatLabel(row.original.paymentMethod),
  },
  {
    accessorKey: "paymentStatus",
    header: sortable,
    cell: ({ row }) => {
      const status = row.original.paymentStatus;
      return (
        <Badge variant="secondary" className={PAYMENT_STATUS_TONE[status]}>
          {PAYMENT_STATUS_LABEL[status]}
        </Badge>
      );
    },
  },
  {
    accessorKey: "transactionStatus",
    header: sortable,
    cell: ({ row }) => formatLabel(row.original.transactionStatus),
  },
  {
    accessorKey: "clientName",
    header: sortable,
    cell: ({ row }) => truncated(row.original.clientName, "max-w-40"),
  },
  {
    accessorKey: "transactionReferenceId",
    header: sortable,
    cell: ({ row }) =>
      truncated(
        row.original.transactionReferenceId,
        "max-w-40",
        "font-mono",
      ),
  },
];

const FAILURE_REASON: ColumnDef<TransactionLogEntry> = {
  accessorKey: "returnDetail",
  header: sortable,
  cell: ({ row }) =>
    row.original.returnDetail
      ? truncated(row.original.returnDetail, "max-w-56")
      : "—",
};

const COLUMNS_WITH_FAILURE_REASON: ColumnDef<TransactionLogEntry>[] = [
  ...BASE_COLUMNS.slice(0, 6),
  FAILURE_REASON,
  ...BASE_COLUMNS.slice(6),
];

// Returns a stable reference — react-table's memoization (and any caller
// passing this straight into useReactTable's columns option) relies on
// that, not just a same-shape array, to avoid recomputing every render.
export const getColumns = (): ColumnDef<TransactionLogEntry>[] =>
  COLUMNS_WITH_FAILURE_REASON;

// One column per metadata key of the selected fee. Kept out of the sortable
// set on purpose: the API cannot ORDER BY a JSON key. Callers memoize on
// feeType so react-table still sees a stable columns reference.
export const metadataColumns = (
  feeType: FeeType | null,
): ColumnDef<TransactionLogEntry>[] =>
  (feeType ? FEE_METADATA_KEYS[feeType] : []).map((key) => ({
    id: `metadata.${key}`,
    header: METADATA_KEY_LABEL[key],
    enableSorting: false,
    cell: ({ row }) => row.original.metadata?.[key] ?? "—",
  }));
