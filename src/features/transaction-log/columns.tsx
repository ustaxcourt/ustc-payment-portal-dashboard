"use client";

import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCourtStamp, formatCurrency, formatLabel } from "@/lib/format";
import SortableHeader from "./SortableHeader";
import { TAB_LABEL, TAB_TONE } from "./statusStyles";
import {
  FEE_METADATA_KEYS,
  type FeeType,
  METADATA_KEY_LABEL,
  type TransactionLogEntry,
  type TransactionSortField,
  type ViewTab,
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
        <Badge variant="secondary" className={TAB_TONE[status]}>
          {TAB_LABEL[status]}
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
  },
  {
    accessorKey: "transactionReferenceId",
    header: sortable,
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.transactionReferenceId}
      </span>
    ),
  },
];

const FAILURE_REASON: ColumnDef<TransactionLogEntry> = {
  accessorKey: "returnDetail",
  header: sortable,
  cell: ({ row }) => row.original.returnDetail ?? "—",
};

export const isSortableOnTab = (
  field: TransactionSortField,
  tab: ViewTab,
): boolean =>
  getColumns(tab).some(
    (column) => (column as { accessorKey?: string }).accessorKey === field,
  );

const COLUMNS_WITH_FAILURE_REASON: ColumnDef<TransactionLogEntry>[] = [
  ...BASE_COLUMNS.slice(0, 6),
  FAILURE_REASON,
  ...BASE_COLUMNS.slice(6),
];

// Returns a stable reference per tab — react-table's memoization (and any
// caller passing this straight into useReactTable's columns option) relies
// on that, not just a same-shape array, to avoid recomputing every render.
export const getColumns = (
  tab: ViewTab,
): ColumnDef<TransactionLogEntry>[] =>
  tab === "failed" || tab === "all" || tab === "search"
    ? COLUMNS_WITH_FAILURE_REASON
    : BASE_COLUMNS;

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
