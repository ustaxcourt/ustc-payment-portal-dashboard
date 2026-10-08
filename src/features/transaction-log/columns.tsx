"use client";

import type {
  ColumnDef,
  HeaderContext,
  RowData,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatCourtStamp, formatCurrency, formatLabel } from "@/lib/format";
import {
  COLUMN_LABEL,
  metadataColumnId,
  type TransactionColumnId,
} from "./columnLabels";
import SortableHeader from "./SortableHeader";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "./statusStyles";
import {
  FEE_METADATA_KEYS,
  type FeeType,
  METADATA_KEYS,
  type MetadataKey,
  type TransactionLogEntry,
  type TransactionSearchFilters,
  type TransactionSortField,
} from "./types";

export type ColumnVisibility = Record<TransactionColumnId, boolean>;

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
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

export const isMetadataColumnId = (id: TransactionColumnId) =>
  id.startsWith("metadata.");

const withFeeMetadataColumns = (
  visibility: ColumnVisibility,
  feeType: FeeType | null,
): ColumnVisibility => {
  const feeKeys = feeType ? FEE_METADATA_KEYS[feeType] : [];
  const next = { ...visibility };
  for (const key of METADATA_KEYS) {
    next[metadataColumnId(key)] = feeKeys.includes(key);
  }
  return next;
};

export const defaultColumnVisibility = (
  feeType: FeeType | null,
): ColumnVisibility =>
  withFeeMetadataColumns(DEFAULT_COLUMN_VISIBILITY, feeType);

export const withFeeDefaults = (
  visibility: ColumnVisibility,
  feeType: FeeType | null,
): ColumnVisibility => {
  const next = withFeeMetadataColumns(visibility, feeType);
  return Object.values(next).some(Boolean)
    ? next
    : defaultColumnVisibility(feeType);
};

export const searchedColumnIds = (
  filters: TransactionSearchFilters,
): TransactionColumnId[] => {
  const ids: TransactionColumnId[] = [];
  if (filters.feeType) ids.push("feeName");
  if (filters.payType) ids.push("paymentMethod");
  if (filters.paymentStatus) ids.push("paymentStatus");
  if (filters.transactionStatus) ids.push("transactionStatus");
  if (filters.metadataKey && filters.metadataValue) {
    ids.push(metadataColumnId(filters.metadataKey));
  }
  return ids;
};

export const isSameVisibility = (
  a: ColumnVisibility,
  b: ColumnVisibility,
): boolean => COLUMN_IDS.every((id) => a[id] === b[id]);

export const withSearchedColumns = (
  visibility: ColumnVisibility,
  searchedIds: readonly TransactionColumnId[],
): ColumnVisibility => {
  const hiddenIds = searchedIds.filter((id) => !visibility[id]);
  if (hiddenIds.length === 0) return visibility;
  const next = { ...visibility };
  for (const id of hiddenIds) next[id] = true;
  return next;
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

type TransactionColumnDef = ColumnDef<TransactionLogEntry> & {
  id: TransactionColumnId;
};

const SORTABLE_COLUMNS: TransactionColumnDef[] = [
  {
    id: "createdAt",
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
    id: "lastUpdatedAt",
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
    id: "feeName",
    accessorKey: "feeName",
    header: sortable,
    size: 130,
    meta: { copyText: (row) => row.feeName, headerLabel: COLUMN_LABEL.feeName },
  },
  {
    id: "transactionAmount",
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
    id: "paymentMethod",
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
    id: "paymentStatus",
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
    id: "returnDetail",
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
    id: "transactionStatus",
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
    id: "clientName",
    accessorKey: "clientName",
    header: sortable,
    size: 120,
    meta: {
      copyText: (row) => row.clientName,
      headerLabel: COLUMN_LABEL.clientName,
    },
  },
  {
    id: "transactionReferenceId",
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
  field: "paygovTrackingId" | "agencyTrackingId",
): TransactionColumnDef => ({
  id: field,
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

const metadataColumn = (key: MetadataKey): TransactionColumnDef => ({
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

export const TRANSACTION_COLUMNS: TransactionColumnDef[] = [
  ...SORTABLE_COLUMNS,
  trackingIdColumn("paygovTrackingId"),
  trackingIdColumn("agencyTrackingId"),
  ...METADATA_KEYS.map(metadataColumn),
];

export const COLUMN_IDS: TransactionColumnId[] = TRANSACTION_COLUMNS.map(
  (column) => column.id,
);
