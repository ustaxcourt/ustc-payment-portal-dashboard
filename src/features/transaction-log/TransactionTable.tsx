"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import type { KeyboardEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  columnVisibility,
  emptyMessage,
  isRefreshing = false,
  wrapperClassName = "flex-1 overflow-auto rounded-md border-2 lg:min-h-0",
}: {
  rows: TransactionLogEntry[];
  columns: ColumnDef<TransactionLogEntry>[];
  caption: string;
  headerTone: string;
  sorting: TransactionSorting;
  onSortingChange: (next: TransactionSorting) => void;
  columnVisibility: VisibilityState;
  emptyMessage: string;
  isRefreshing?: boolean;
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
    state: { sorting: sortingState, columnVisibility },
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeCellRef = useRef({ row: 0, col: 0 });
  const visibleColumnKey = leafColumns.map((col) => col.id).join(",");
  const previousVisibleColumnKeyRef = useRef(visibleColumnKey);
  if (previousVisibleColumnKeyRef.current !== visibleColumnKey) {
    previousVisibleColumnKeyRef.current = visibleColumnKey;
    activeCellRef.current = { row: 0, col: 0 };
  }
  activeCellRef.current = {
    row: Math.min(activeCellRef.current.row,
      Math.max(tableRows.length - 1, 0)),
    col: Math.min(activeCellRef.current.col,
      Math.max(leafColumns.length - 1, 0)),
  };

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const { row, col } = activeCellRef.current;
    const target = container.querySelector<HTMLButtonElement>(
      `button[data-row="${row}"][data-col="${col}"]`,
    );
    for (const stale of container.querySelectorAll<HTMLButtonElement>(
      'button[tabindex="0"]',
    )) {
      if (stale !== target) stale.tabIndex = -1;
    }
    if (target) target.tabIndex = 0;
  });

  const handleGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const delta = ARROW_DELTAS[event.key];
    if (!delta) return;

    const current = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-row][data-col]",
    );
    if (!current) return;

    event.preventDefault();

    const nextRow = Number(current.dataset.row) + delta.row;
    const nextCol = Number(current.dataset.col) + delta.col;
    const next = event.currentTarget.querySelector<HTMLButtonElement>(
      `button[data-row="${nextRow}"][data-col="${nextCol}"]`,
    );
    if (!next) return;

    current.tabIndex = -1;
    next.tabIndex = 0;
    activeCellRef.current = { row: nextRow, col: nextCol };
    next.focus();
  };

  return (
    <div
      ref={scrollRef}
      data-testid="transaction-table-scroll"
      className={cn("relative", wrapperClassName)}
      aria-busy={isRefreshing || undefined}
    >
      {isRefreshing && tableRows.length > 0 ? (
        // A zero-height sticky wrapper positioned before the table, so its
        // un-stuck flow position already sits at top:0 and it's pinned from
        // the start — not just once scrolled down to where it'd naturally
        // sit — the same mechanism the header itself relies on, rather than
        // position:absolute (which, anchored to this same scrolling
        // element, scrolls away with the rest of the content instead of
        // staying pinned like the sticky header does).
        <div className="sticky top-0 left-0 z-20 h-0 overflow-visible">
          <div
            role="status"
            className={cn(
              "flex h-7 items-center justify-center text-xs text-muted-foreground",
              headerTone,
            )}
          >
            Updating…
          </div>
        </div>
      ) : null}
      <Table
        role="grid"
        onKeyDown={handleGridKeyDown}
        style={tableRows.length > 0 ? { minWidth: totalSize } : undefined}
        className={cn(
          "table-fixed text-xs",
          isRefreshing && tableRows.length > 0 && "opacity-50",
        )}
      >
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
            <TableRow
              key={headerGroup.id}
              role="row"
              className="hover:bg-transparent"
            >
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
          {tableRows.map((row, rowIndex) => (
            <TableRow key={row.id} role="row">
              {row.getVisibleCells().map((cell, colIndex) => (
                <CopyableCell
                  key={cell.id}
                  text={cell.column.columnDef.meta?.copyText?.(row.original)}
                  rowIndex={rowIndex}
                  colIndex={colIndex}
                  isTabbable={
                    activeCellRef.current.row === rowIndex &&
                    activeCellRef.current.col === colIndex
                  }
                  className={cn(
                    "px-1.5 py-1",
                    cellBorder(colIndex, row.getVisibleCells().length),
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
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center bg-background text-center text-xs text-muted-foreground"
        >
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
  rowIndex,
  colIndex,
  isTabbable,
}: {
  text?: string;
  className?: string;
  children: React.ReactNode;
  rowIndex: number;
  colIndex: number;
  isTabbable: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  if (!text) {
    return (
      <TableCell role="gridcell" className={className}>
        {children}
      </TableCell>
    );
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
      role="gridcell"
      title={text}
      className={cn(copied && "bg-primary/10", className, "p-0")}
    >
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy ${text}`}
        data-row={rowIndex}
        data-col={colIndex}
        tabIndex={isTabbable ? 0 : -1}
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

const ARROW_DELTAS: Record<string, { row: number; col: number }> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
};

const cellBorder = (index: number, total: number) =>
  index === total - 1 ? undefined : "border-r";

const ariaSort = (
  sorted: false | "asc" | "desc",
): "ascending" | "descending" | "none" => {
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return "none";
};
