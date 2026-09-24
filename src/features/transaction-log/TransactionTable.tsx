"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  isTransactionSortField,
  type TransactionLogEntry,
  type TransactionSorting,
} from "./types";

// Core model only: the server owns sorting, filtering and pagination.
export default function TransactionTable({
  rows,
  columns,
  caption,
  headerTone,
  sorting,
  onSortingChange,
  emptyMessage,
  wrapperClassName = "flex-1 overflow-auto rounded-md border-2 table-border lg:min-h-0",
}: {
  rows: TransactionLogEntry[];
  columns: ColumnDef<TransactionLogEntry>[];
  caption: string;
  headerTone: string;
  sorting: TransactionSorting;
  onSortingChange: (next: TransactionSorting) => void;
  emptyMessage: string;
  wrapperClassName?: string;
}) {
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

  const leafColumns = table.getVisibleLeafColumns();
  const totalSize = leafColumns.reduce((sum, col) => sum + col.getSize(), 0);

  return (
    <div data-testid="transaction-table-scroll" className={wrapperClassName}>
      <Table className="table-fixed text-xs">
        <TableCaption className="sr-only">{caption}</TableCaption>
        <colgroup>
          {leafColumns.map((col) => (
            <col
              key={col.id}
              style={{ width: `${(col.getSize() / totalSize) * 100}%` }}
            />
          ))}
        </colgroup>
        <TableHeader className={cn("sticky top-0 z-10", headerTone)}>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header, index) => (
                <TableHead
                  key={header.id}
                  aria-sort={
                    header.column.getCanSort()
                      ? ariaSort(header.column.getIsSorted())
                      : undefined
                  }
                  className={cn(
                    "h-7 px-1.5",
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
                  <CopyableCell
                    key={cell.id}
                    text={cell.column.columnDef.meta?.copyText?.(row.original)}
                    className={cn(
                      "px-1.5 py-1",
                      cellBorder(index, row.getVisibleCells().length),
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </CopyableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Cells truncate to fit their column (see the colgroup above), so a click
// copies — and a hover title shows — the untruncated value from the
// column's `meta.copyText` rather than whatever's visibly clipped.
function CopyableCell({
  text,
  className,
  children,
}: {
  text?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleClick = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — no-op.
    }
  };

  return (
    <TableCell
      title={text}
      onClick={handleClick}
      className={cn(
        text && "cursor-pointer",
        copied && "bg-primary/10",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

const cellBorder = (index: number, total: number) =>
  index === total - 1 ? undefined : "border-r";

const ariaSort = (
  sorted: false | "asc" | "desc",
): "ascending" | "descending" | "none" => {
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return "none";
};
