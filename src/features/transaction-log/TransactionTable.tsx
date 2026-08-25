"use client";

import {
  flexRender,
  getCoreRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getColumns } from "./columns";
import { TAB_HEADER_TONE, TAB_LABEL } from "./statusStyles";
import {
  isTransactionSortField,
  type TransactionLogEntry,
  type TransactionSorting,
  type TransactionTab,
} from "./types";

// Core model only: the server owns sorting, filtering and pagination.
export default function TransactionTable({
  rows,
  tab,
  sorting,
  onSortingChange,
  emptyMessage,
}: {
  rows: TransactionLogEntry[];
  tab: TransactionTab;
  sorting: TransactionSorting;
  onSortingChange: (next: TransactionSorting) => void;
  emptyMessage: string;
}) {
  const columns = useMemo(() => getColumns(tab), [tab]);

  const sortingState: SortingState = useMemo(
    () => [{ id: sorting.sort, desc: sorting.order === "desc" }],
    [sorting.sort, sorting.order],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSortingRemoval: false,
    state: { sorting: sortingState },
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(sortingState) : updater;
      const [column] = next;
      if (!column || !isTransactionSortField(column.id)) return;

      onSortingChange({
        sort: column.id,
        order: column.desc ? "desc" : "asc",
      });
    },
  });

  return (
    <div
      data-testid="transaction-table-scroll"
      className="min-h-0 flex-1 overflow-auto rounded-b-md border-2 border-t-0 border-muted-foreground"
    >
      <Table>
        <TableCaption className="sr-only">
          Transaction log, {TAB_LABEL[tab]}
        </TableCaption>
        <TableHeader
          className={cn("sticky top-0 z-10", TAB_HEADER_TONE[tab])}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header, index) => (
                <TableHead
                  key={header.id}
                  aria-sort={ariaSort(header.column.getIsSorted())}
                  className={cn(
                    "h-8",
                    cellBorder(index, headerGroup.headers.length),
                  )}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell, index) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "py-1",
                      cellBorder(index, row.getVisibleCells().length),
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

const cellBorder = (index: number, total: number) =>
  index === total - 1 ? "whitespace-nowrap" : "whitespace-nowrap border-r";

const ariaSort = (
  sorted: false | "asc" | "desc",
): "ascending" | "descending" | "none" => {
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return "none";
};
