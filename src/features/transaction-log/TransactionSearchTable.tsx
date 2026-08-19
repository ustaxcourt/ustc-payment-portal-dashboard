"use client";

import { useMemo } from "react";
import { getSearchColumns } from "./columns";
import DataTable from "./DataTable";
import type { TransactionLogEntry, TransactionSorting } from "./types";

export default function TransactionSearchTable({
  rows,
  sorting,
  onSortingChange,
  emptyMessage,
}: {
  rows: TransactionLogEntry[];
  sorting: TransactionSorting;
  onSortingChange: (next: TransactionSorting) => void;
  emptyMessage: string;
}) {
  const columns = useMemo(() => getSearchColumns(), []);

  return (
    <DataTable
      rows={rows}
      columns={columns}
      caption="Transaction log, Search results"
      headerTone="bg-slate-50"
      sorting={sorting}
      onSortingChange={onSortingChange}
      emptyMessage={emptyMessage}
      wrapperClassName="max-h-[60vh] overflow-auto rounded-md border"
    />
  );
}
