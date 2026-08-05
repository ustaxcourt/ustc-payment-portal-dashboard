"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCourtStamp, formatCurrency, formatLabel } from "@/lib/format";
import { TAB_LABEL, TAB_TONE } from "./statusStyles";
import type { TransactionLogEntry, TransactionTab } from "./types";

const BASE_COLUMNS: ColumnDef<TransactionLogEntry>[] = [
  {
    accessorKey: "createdAt",
    header: "Created",
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
    header: "Last updated",
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
    header: "Fee type",
  },
  {
    accessorKey: "transactionAmount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.transactionAmount)}
      </span>
    ),
  },
  {
    accessorKey: "paymentMethod",
    header: "Payment method",
    cell: ({ row }) => formatLabel(row.original.paymentMethod),
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment status",
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
    header: "Transaction status",
    cell: ({ row }) => formatLabel(row.original.transactionStatus),
  },
  {
    accessorKey: "clientName",
    header: "Client",
  },
  {
    accessorKey: "transactionReferenceId",
    header: "Reference ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.transactionReferenceId}
      </span>
    ),
  },
];

const FAILURE_REASON: ColumnDef<TransactionLogEntry> = {
  accessorKey: "returnDetail",
  header: "Failure reason",
  cell: ({ row }) => row.original.returnDetail ?? "—",
};

export const getColumns = (
  tab: TransactionTab,
): ColumnDef<TransactionLogEntry>[] =>
  tab === "failed" || tab === "all"
    ? [...BASE_COLUMNS.slice(0, 6), FAILURE_REASON, ...BASE_COLUMNS.slice(6)]
    : BASE_COLUMNS;
