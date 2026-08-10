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
import { getColumns } from "./columns";
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
  });

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-b-md border border-t-0">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-green-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header, index) => (
                <TableHead
                  key={header.id}
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

const cellBorder = (index: number, total: number) =>
  index === total - 1 ? "whitespace-nowrap" : "whitespace-nowrap border-r";
