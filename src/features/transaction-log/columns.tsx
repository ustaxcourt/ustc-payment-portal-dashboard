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

// The table's columns share the available width (see TransactionTable's
// colgroup) instead of growing to fit content, so every cell truncates with
// a hover tooltip + click-to-copy instead — see `meta.copyText` below,
// which supplies the untruncated value for both.
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    copyText?: (row: TData) => string;
  }
}

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
    size: 115,
    cell: ({ row }) => {
      const stamp = formatCourtStamp(row.original.createdAt);
      return (
        <div className="leading-tight">
          <div>{stamp.date}</div>
          <div className="text-muted-foreground">{stamp.time}</div>
        </div>
      );
    },
    meta: {
      copyText: (row) => {
        const stamp = formatCourtStamp(row.createdAt);
        return `${stamp.date} ${stamp.time}`;
      },
    },
  },
  {
    accessorKey: "lastUpdatedAt",
    header: sortable,
    sortDescFirst: true,
    size: 115,
    cell: ({ row }) => {
      const stamp = formatCourtStamp(row.original.lastUpdatedAt);
      return (
        <div className="leading-tight">
          <div>{stamp.date}</div>
          <div className="text-muted-foreground">{stamp.time}</div>
        </div>
      );
    },
    meta: {
      copyText: (row) => {
        const stamp = formatCourtStamp(row.lastUpdatedAt);
        return `${stamp.date} ${stamp.time}`;
      },
    },
  },
  {
    accessorKey: "feeName",
    header: sortable,
    size: 130,
    meta: { copyText: (row) => row.feeName },
  },
  {
    accessorKey: "transactionAmount",
    header: sortable,
    size: 80,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.transactionAmount)}
      </span>
    ),
    meta: { copyText: (row) => formatCurrency(row.transactionAmount) },
  },
  {
    accessorKey: "paymentMethod",
    header: sortable,
    size: 100,
    cell: ({ row }) => formatLabel(row.original.paymentMethod),
    meta: { copyText: (row) => formatLabel(row.paymentMethod) },
  },
  {
    accessorKey: "paymentStatus",
    header: sortable,
    size: 85,
    cell: ({ row }) => {
      const status = row.original.paymentStatus;
      return (
        <Badge variant="secondary" className={PAYMENT_STATUS_TONE[status]}>
          {PAYMENT_STATUS_LABEL[status]}
        </Badge>
      );
    },
    meta: { copyText: (row) => PAYMENT_STATUS_LABEL[row.paymentStatus] },
  },
  {
    accessorKey: "transactionStatus",
    header: sortable,
    size: 100,
    cell: ({ row }) => formatLabel(row.original.transactionStatus),
    meta: { copyText: (row) => formatLabel(row.transactionStatus) },
  },
  {
    accessorKey: "clientName",
    header: sortable,
    size: 120,
    meta: { copyText: (row) => row.clientName },
  },
  {
    accessorKey: "transactionReferenceId",
    header: sortable,
    size: 130,
    cell: ({ row }) => (
      <span className="font-mono">{row.original.transactionReferenceId}</span>
    ),
    meta: { copyText: (row) => row.transactionReferenceId },
  },
];

const FAILURE_REASON: ColumnDef<TransactionLogEntry> = {
  accessorKey: "returnDetail",
  header: sortable,
  size: 150,
  cell: ({ row }) => row.original.returnDetail ?? "—",
  meta: { copyText: (row) => row.returnDetail ?? "—" },
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
    size: 110,
    meta: { copyText: (row) => row.metadata?.[key] ?? "—" },
    cell: ({ row }) => row.original.metadata?.[key] ?? "—",
  }));
