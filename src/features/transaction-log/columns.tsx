"use client";

import type {
  ColumnDef,
  HeaderContext,
  RowData,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCourtStamp, formatCurrency, formatLabel } from "@/lib/format";
import SortableHeader from "./SortableHeader";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "./statusStyles";
import {
  METADATA_KEY_LABEL,
  METADATA_KEYS,
  type MetadataKey,
  type TransactionLogEntry,
  type TransactionSortField,
} from "./types";

type TrackingIdField = "paygovTrackingId" | "agencyTrackingId";

type MetadataColumnId = `metadata.${MetadataKey}`;

export type TransactionColumnId =
  | TransactionSortField
  | TrackingIdField
  | MetadataColumnId;

const metadataColumnId = (key: MetadataKey): MetadataColumnId =>
  `metadata.${key}`;

export const COLUMN_LABEL: Record<TransactionColumnId, string> = {
  createdAt: "Created",
  lastUpdatedAt: "Last updated",
  feeName: "Fee",
  transactionAmount: "Amount",
  paymentMethod: "Payment method",
  paymentStatus: "Payment status",
  returnDetail: "Failure reason",
  transactionStatus: "Transaction status",
  clientName: "Client",
  transactionReferenceId: "Reference ID",
  paygovTrackingId: "Pay.gov Tracking ID",
  agencyTrackingId: "Agency Tracking ID",
  "metadata.docketNumber": METADATA_KEY_LABEL.docketNumber,
  "metadata.email": METADATA_KEY_LABEL.email,
  "metadata.fullName": METADATA_KEY_LABEL.fullName,
  "metadata.accessCode": METADATA_KEY_LABEL.accessCode,
};

export const DEFAULT_COLUMN_VISIBILITY: Record<TransactionColumnId, boolean> =
  {
    createdAt: false,
    lastUpdatedAt: true,
    feeName: true,
    transactionAmount: true,
    paymentMethod: false,
    paymentStatus: true,
    returnDetail: false,
    transactionStatus: false,
    clientName: false,
    transactionReferenceId: false,
    paygovTrackingId: false,
    agencyTrackingId: false,
    "metadata.docketNumber": false,
    "metadata.email": false,
    "metadata.fullName": false,
    "metadata.accessCode": false,
  };

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    copyText?: (row: TData) => string;
    headerLabel?: string;
  }
}

const sortable = ({ column }: HeaderContext<TransactionLogEntry, unknown>) => (
  <SortableHeader
    label={COLUMN_LABEL[column.id as TransactionSortField]}
    sorted={column.getIsSorted()}
    onToggle={() => column.toggleSorting()}
  />
);

const SORTABLE_COLUMNS: ColumnDef<TransactionLogEntry>[] = [
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
      headerLabel: COLUMN_LABEL.createdAt,
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
      headerLabel: COLUMN_LABEL.lastUpdatedAt,
    },
  },
  {
    accessorKey: "feeName",
    header: sortable,
    size: 130,
    meta: { copyText: (row) => row.feeName, headerLabel: COLUMN_LABEL.feeName },
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
    meta: {
      copyText: (row) => formatCurrency(row.transactionAmount),
      headerLabel: COLUMN_LABEL.transactionAmount,
    },
  },
  {
    accessorKey: "paymentMethod",
    header: sortable,
    size: 100,
    cell: ({ row }) => formatLabel(row.original.paymentMethod),
    meta: {
      copyText: (row) => formatLabel(row.paymentMethod),
      headerLabel: COLUMN_LABEL.paymentMethod,
    },
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
    meta: {
      copyText: (row) => PAYMENT_STATUS_LABEL[row.paymentStatus],
      headerLabel: COLUMN_LABEL.paymentStatus,
    },
  },
  {
    accessorKey: "returnDetail",
    header: sortable,
    size: 150,
    cell: ({ row }) => row.original.returnDetail ?? "—",
    meta: {
      copyText: (row) => row.returnDetail ?? "—",
      headerLabel: COLUMN_LABEL.returnDetail,
    },
  },
  {
    accessorKey: "transactionStatus",
    header: sortable,
    size: 100,
    cell: ({ row }) => formatLabel(row.original.transactionStatus),
    meta: {
      copyText: (row) => formatLabel(row.transactionStatus),
      headerLabel: COLUMN_LABEL.transactionStatus,
    },
  },
  {
    accessorKey: "clientName",
    header: sortable,
    size: 120,
    meta: {
      copyText: (row) => row.clientName,
      headerLabel: COLUMN_LABEL.clientName,
    },
  },
  {
    accessorKey: "transactionReferenceId",
    header: sortable,
    size: 130,
    cell: ({ row }) => (
      <span className="font-mono">{row.original.transactionReferenceId}</span>
    ),
    meta: {
      copyText: (row) => row.transactionReferenceId,
      headerLabel: COLUMN_LABEL.transactionReferenceId,
    },
  },
];

const trackingIdColumn = (
  field: TrackingIdField,
): ColumnDef<TransactionLogEntry> => ({
  accessorKey: field,
  header: COLUMN_LABEL[field],
  enableSorting: false,
  size: 130,
  cell: ({ row }) => (
    <span className="font-mono">{row.original[field] ?? "—"}</span>
  ),
  meta: {
    copyText: (row) => row[field] ?? "—",
    headerLabel: COLUMN_LABEL[field],
  },
});

const metadataColumn = (key: MetadataKey): ColumnDef<TransactionLogEntry> => ({
  id: metadataColumnId(key),
  header: COLUMN_LABEL[metadataColumnId(key)],
  enableSorting: false,
  size: 110,
  meta: {
    copyText: (row) => row.metadata?.[key] ?? "—",
    headerLabel: COLUMN_LABEL[metadataColumnId(key)],
  },
  cell: ({ row }) => row.original.metadata?.[key] ?? "—",
});

const ALL_COLUMNS: ColumnDef<TransactionLogEntry>[] = [
  ...SORTABLE_COLUMNS,
  trackingIdColumn("paygovTrackingId"),
  trackingIdColumn("agencyTrackingId"),
  ...METADATA_KEYS.map(metadataColumn),
];

export const getColumns = (): ColumnDef<TransactionLogEntry>[] => ALL_COLUMNS;
