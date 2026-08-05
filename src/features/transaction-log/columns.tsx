"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCourtDateTime, formatCurrency, formatLabel } from "@/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "./statusStyles";
import type { PaymentStatus, TransactionLogEntry } from "./types";

/** Headers are labels only — sorting is fixed server-side on lastUpdatedAt. */
const BASE_COLUMNS: ColumnDef<TransactionLogEntry>[] = [
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatCourtDateTime(row.original.createdAt),
  },
  {
    accessorKey: "lastUpdatedAt",
    header: "Last updated",
    cell: ({ row }) => formatCourtDateTime(row.original.lastUpdatedAt),
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
        <Badge variant="secondary" className={STATUS_TONE[status]}>
          {STATUS_LABEL[status]}
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
  status: PaymentStatus,
): ColumnDef<TransactionLogEntry>[] =>
  status === "failed"
    ? [...BASE_COLUMNS.slice(0, 6), FAILURE_REASON, ...BASE_COLUMNS.slice(6)]
    : BASE_COLUMNS;
