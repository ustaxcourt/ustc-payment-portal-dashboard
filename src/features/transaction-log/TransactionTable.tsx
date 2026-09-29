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
  wrapperClassName = "flex-1 overflow-auto rounded-md border-2 lg:min-h-0",
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
  const tableRows = table.getRowModel().rows;

  return (
    <div
      data-testid="transaction-table-scroll"
      className={cn("relative", wrapperClassName)}
    >
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
                  title={header.column.columnDef.meta?.headerLabel}
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
          {tableRows.map((row) => (
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
          ))}
        </TableBody>
      </Table>
      {tableRows.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background text-center text-xs text-muted-foreground">
          {emptyMessage}
        </div>
      ) : null}
    </div>
  );
}

// Cells truncate to fit their column (see the colgroup above), so clicking —
// or focusing the cell's copy button and pressing Enter/Space — copies the
// untruncated value from the column's `meta.copyText` rather than whatever's
// visibly clipped. A hover title shows the same full value.
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

  if (!text) {
    return <TableCell className={className}>{children}</TableCell>;
  }

  const handleCopy = async () => {
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
      className={cn(copied && "bg-primary/10", className, "p-0")}
    >
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy ${text}`}
        className="block w-full truncate px-1.5 py-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        {children}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
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
