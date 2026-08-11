"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getColumns } from "./columns";
import { TAB_HEADER_TONE } from "./statusStyles";
import type { TransactionLogEntry, TransactionTab } from "./types";

// Core model only: the server owns sorting, filtering and pagination.
export default function TransactionTable({
  rows,
  tab,
  emptyMessage,
}: {
  rows: TransactionLogEntry[];
  tab: TransactionTab;
  emptyMessage: string;
}) {
  const columns = useMemo(() => getColumns(tab), [tab]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // The server orders the rows; the table only renders the indicator.
    manualSorting: true,
    // The log is never unsorted: it opens on the newest transactions, and a
    // third click flips back to ascending rather than clearing the order.
    enableSortingRemoval: false,
    initialState: { sorting: [{ id: DEFAULT_SORT, desc: true }] },
  });

  return (
    <div className="max-h-[60vh] overflow-auto rounded-b-md border border-t-0">
      <Table>
        <TableHeader
          className={cn("sticky top-0 z-10", TAB_HEADER_TONE[tab])}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header, index) => (
                <TableHead
                  key={header.id}
                  aria-sort={ariaSort(header.column.getIsSorted())}
                  className={cellBorder(index, headerGroup.headers.length)}
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
                    className={cellBorder(index, row.getVisibleCells().length)}
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

/** The log opens on the newest transactions by creation time. Named here so the
 *  URL state and the request in the next layer can share one definition. */
export const DEFAULT_SORT = "createdAt";

const cellBorder = (index: number, total: number) =>
  index === total - 1 ? "whitespace-nowrap" : "whitespace-nowrap border-r";

/** Every sortable column carries `aria-sort`; only the active one reports a
 *  direction. This is where assistive technology reads the sort state from. */
const ariaSort = (
  sorted: false | "asc" | "desc",
): "ascending" | "descending" | "none" => {
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return "none";
};
