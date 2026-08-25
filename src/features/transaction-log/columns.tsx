"use client";

import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCourtStamp, formatCurrency, formatLabel } from "@/lib/format";
import SortableHeader from "./SortableHeader";
import { TAB_LABEL, TAB_TONE } from "./statusStyles";
import type {
  TransactionLogEntry,
  TransactionSortField,
  ViewTab,
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

const sortable =
  (label?: string) =>
  ({ column }: HeaderContext<TransactionLogEntry, unknown>) => (
    <SortableHeader
      label={label ?? COLUMN_LABEL[column.id as TransactionSortField]}
      sorted={column.getIsSorted()}
      onToggle={() => column.toggleSorting()}
    />
  );

const BASE_COLUMNS: ColumnDef<TransactionLogEntry>[] = [
  {
    accessorKey: "createdAt",
    header: sortable(),
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
    header: sortable(),
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
    header: sortable(),
  },
  {
    accessorKey: "transactionAmount",
    header: sortable(),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.transactionAmount)}
      </span>
    ),
  },
  {
    accessorKey: "paymentMethod",
    header: sortable(),
    cell: ({ row }) => formatLabel(row.original.paymentMethod),
  },
  {
    accessorKey: "paymentStatus",
    header: sortable(),
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
    header: sortable(),
    cell: ({ row }) => formatLabel(row.original.transactionStatus),
  },
  {
    accessorKey: "clientName",
    header: sortable(),
  },
  {
    accessorKey: "transactionReferenceId",
    header: sortable(),
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.transactionReferenceId}
      </span>
    ),
  },
];

const FAILURE_REASON: ColumnDef<TransactionLogEntry> = {
  accessorKey: "returnDetail",
  header: sortable(),
  cell: ({ row }) => row.original.returnDetail ?? "—",
};

export const isSortableOnTab = (
  field: TransactionSortField,
  tab: ViewTab,
): boolean =>
  getColumns(tab).some(
    (column) => (column as { accessorKey?: string }).accessorKey === field,
  );

export const getColumns = (
  tab: ViewTab,
): ColumnDef<TransactionLogEntry>[] =>
  tab === "failed" || tab === "all" || tab === "search"
    ? [...BASE_COLUMNS.slice(0, 6), FAILURE_REASON, ...BASE_COLUMNS.slice(6)]
    : BASE_COLUMNS;
