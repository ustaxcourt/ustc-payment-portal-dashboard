"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Drawer,
  DrawerBackdrop,
  DrawerPopup,
  DrawerPortal,
  DrawerViewport,
} from "@/components/ui/drawer";
import ErrorPanel from "@/components/ui/ErrorPanel";
import { IconButton } from "@/components/ui/icon-button";
import { COLUMN_LABEL, getColumns, metadataColumns } from "./columns";
import { PAYMENT_STATUS_LABEL } from "./statusStyles";
import TransactionFilters from "./TransactionFilters";
import TransactionTable from "./TransactionTable";
import type { FeeType, PaymentStatus, TransactionSearchFilters } from "./types";
import { useRetainedCounts } from "./useRetainedCounts";
import { useTransactionLog } from "./useTransactionLog";
import { useTransactionLogParams } from "./useTransactionLogParams";

export default function TransactionLog() {
  const {
    setParams,
    appliedRange,
    activeSorting,
    searchFilters,
    hasSearchCriteria,
    clearSearch,
  } = useTransactionLogParams();

  const { data, isPending, isPlaceholderData, isError, error, refetch } =
    useTransactionLog(appliedRange, activeSorting, searchFilters);

  // Below `lg` the filters live in a Drawer overlay instead of the static
  // sidebar, so they never compete with the table for vertical space.
  const [isNarrow, setIsNarrow] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersScopeRef = useRef<HTMLDivElement>(null);

  // The drawer is positioned `fixed` (see drawer.tsx) so it always lands
  // fully on-screen and can scroll, regardless of where filtersScopeRef sits
  // in the (possibly very tall) page. This computes the on-screen rect to
  // pin it to — the container's intersection with the viewport — so it
  // visually reads as scoped to the table card rather than the full window.
  const [drawerRect, setDrawerRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const handleChange = () => setIsNarrow(query.matches);
    handleChange();
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isNarrow) setFiltersOpen(false);
  }, [isNarrow]);

  useLayoutEffect(() => {
    if (!isNarrow || !filtersOpen) return;
    const updateRect = () => {
      const el = filtersScopeRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, window.innerHeight);
      setDrawerRect({
        top,
        left: rect.left,
        width: rect.width,
        height: Math.max(bottom - top, 0),
      });
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [isNarrow, filtersOpen]);

  // Counts span the whole timeframe; retained across refetches (scoped to
  // their range) so the sidebar's badges don't blank out while filtering.
  const counts = useRetainedCounts(
    isPlaceholderData ? undefined : data?.counts,
    `${appliedRange.from}..${appliedRange.to}`,
  );

  // Metadata columns follow the selected fee; memoized so react-table keeps
  // seeing a stable columns reference between renders.
  const columns = useMemo(
    () => [...getColumns(), ...metadataColumns(searchFilters.feeType)],
    [searchFilters.feeType],
  );

  const onFilterChange = (
    key: keyof TransactionSearchFilters,
    value: string | null,
  ) => {
    if (key === "feeType") {
      setParams({
        feeType: value as FeeType | null,
        metadataKey: null,
        metadataValue: null,
      });
      return;
    }
    if (key === "paymentStatus") {
      // Write forward to the canonical `status` key and clear the legacy one.
      setParams({ status: value as PaymentStatus | null, paymentStatus: null });
      return;
    }
    setParams({ [key]: value } as Pick<TransactionSearchFilters, typeof key>);
  };

  const statusLabel = searchFilters.paymentStatus
    ? PAYMENT_STATUS_LABEL[searchFilters.paymentStatus]
    : "All";

  const backdropStyle = drawerRect
    ? {
        top: drawerRect.top,
        left: drawerRect.left,
        width: drawerRect.width,
        height: drawerRect.height,
      }
    : undefined;

  const viewportStyle = drawerRect
    ? { top: drawerRect.top, left: drawerRect.left, height: drawerRect.height }
    : undefined;

  const filtersPanel = (
    <TransactionFilters
      filters={searchFilters}
      counts={counts}
      onFilterChange={onFilterChange}
      onMetadataSearch={(metadataKey, metadataValue) =>
        setParams({ metadataKey, metadataValue })
      }
      onClear={clearSearch}
      hasActiveFilters={hasSearchCriteria}
    />
  );

  const copyShareLink = () => {
    // TODO: copy a shareable link for the current filters/timeframe.
  };

  const downloadReport = () => {
    // TODO: download the transaction log as a report.
  };

  const selectColumns = () => {
    // TODO: let the user choose which columns are visible.
  };

  return (
    <section className="flex w-full flex-1 flex-col lg:min-h-0">
      <p aria-live="polite" className="sr-only">
        {data?.sort && COLUMN_LABEL[data.sort]
          ? `Sorted by ${COLUMN_LABEL[data.sort]}, ${
              data.order === "desc" ? "descending" : "ascending"
            }`
          : ""}
      </p>

      {isError ? (
        <ErrorPanel
          title="Could not load the transaction log."
          message={error.message}
          onRetry={refetch}
        />
      ) : (
        <div className="flex flex-1 flex-col rounded-md border-2 table-border lg:min-h-0">
          <div className="flex items-center justify-between rounded-t-[calc(var(--radius-md)-2px)] border-b-2 table-border bg-status-neutral px-4 py-2">
            <h2 className="text-base font-bold tracking-tight">
              Transaction Log
              {typeof data?.total === "number" ? ` (${data.total})` : ""}
            </h2>
            <div className="flex items-center gap-2">
              <span className="relative lg:hidden">
                <IconButton
                  icon="filter"
                  label="Show filters"
                  onClick={() => setFiltersOpen(true)}
                />
                {hasSearchCriteria ? (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary"
                  />
                ) : null}
              </span>
              <IconButton
                icon="link"
                label="Copy share link"
                onClick={copyShareLink}
              />
              <IconButton
                icon="download"
                label="Download report"
                onClick={downloadReport}
              />
              <IconButton
                icon="columns"
                label="Select columns"
                onClick={selectColumns}
              />
            </div>
          </div>

          <div
            ref={filtersScopeRef}
            className="flex flex-1 flex-col lg:min-h-0 lg:flex-row"
          >
            {isNarrow ? (
              <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DrawerPortal>
                  <DrawerBackdrop style={backdropStyle} />
                  <DrawerViewport style={viewportStyle}>
                    <DrawerPopup aria-label="Filters">{filtersPanel}</DrawerPopup>
                  </DrawerViewport>
                </DrawerPortal>
              </Drawer>
            ) : (
              filtersPanel
            )}

            <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
              <TransactionTable
                rows={data?.data ?? []}
                columns={columns}
                caption={`Transaction log, ${statusLabel}`}
                headerTone="bg-status-neutral-subtle"
                sorting={activeSorting}
                onSortingChange={setParams}
                wrapperClassName="flex-1 overflow-auto rounded-br-[calc(var(--radius-md)-2px)] border table-border lg:min-h-0"
                emptyMessage={
                  isPending
                    ? "Loading transactions…"
                    : hasSearchCriteria
                      ? "No transactions match your filters."
                      : "No transactions to show."
                }
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
