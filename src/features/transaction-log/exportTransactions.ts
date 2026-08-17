import type { AppliedDateRange } from "./dateRange";
import type {
  TransactionLogEntry,
  TransactionLogResponse,
  TransactionSorting,
  TransactionTab,
} from "./types";

/** Mirrors `TRANSACTION_LOG_MAX_EXPORT_PAGE_SIZE` in the payment portal. */
export const EXPORT_PAGE_SIZE = 5000;
/** Product ceiling: above this the user is asked to narrow the timeframe. */
export const EXPORT_ROW_LIMIT = 50_000;
const CONCURRENCY = 5;

export class ExportTooLargeError extends Error {
  readonly total: number;

  constructor(total: number) {
    super(
      `The current view has ${total.toLocaleString()} transactions; exports are limited to ${EXPORT_ROW_LIMIT.toLocaleString()}.`,
    );
    this.name = "ExportTooLargeError";
    this.total = total;
  }
}

export type ExportProgress = { fetched: number; total: number };

const fetchExportPage = async (
  tab: TransactionTab,
  range: AppliedDateRange,
  sorting: TransactionSorting,
  page: number,
  signal?: AbortSignal,
): Promise<TransactionLogResponse> => {
  const params = new URLSearchParams({
    export: "true",
    from: range.from,
    order: sorting.order,
    page: String(page),
    pageSize: String(EXPORT_PAGE_SIZE),
    sort: sorting.sort,
    to: range.to,
  });
  if (tab !== "all") params.set("status", tab);

  const response = await fetch(`/api/transactions?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Export request failed with ${response.status}`);
  }

  return response.json();
};

/** One retry per page; a mid-export blip should not cost the whole file. */
const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return fn();
  }
};

/** Fetches every row of the current view, `CONCURRENCY` pages at a time.
 *
 *  Offset paging is not a snapshot: a row updated mid-export re-sorts and can
 *  shift page boundaries. When the assembled rows disagree with page 1's
 *  total, the set moved underneath us — refetch once from the top. */
export const fetchAllTransactions = async (
  tab: TransactionTab,
  range: AppliedDateRange,
  sorting: TransactionSorting,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: ExportProgress) => void;
  } = {},
): Promise<{ rows: TransactionLogEntry[]; total: number }> => {
  const first = await fetchAllOnce(tab, range, sorting, options);
  if (first.rows.length === first.total) return first;
  return fetchAllOnce(tab, range, sorting, options);
};

const fetchAllOnce = async (
  tab: TransactionTab,
  range: AppliedDateRange,
  sorting: TransactionSorting,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: ExportProgress) => void;
  } = {},
): Promise<{ rows: TransactionLogEntry[]; total: number }> => {
  const { signal, onProgress } = options;

  const first = await withRetry(() =>
    fetchExportPage(tab, range, sorting, 1, signal),
  );
  const total = first.total ?? first.data.length;
  if (total > EXPORT_ROW_LIMIT) throw new ExportTooLargeError(total);
  onProgress?.({ fetched: first.data.length, total });

  const lastPage = Math.max(1, Math.ceil(total / EXPORT_PAGE_SIZE));
  const pages: TransactionLogEntry[][] = new Array(lastPage);
  pages[0] = first.data;
  let fetched = first.data.length;

  let nextPage = 2;
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, Math.max(0, lastPage - 1)) },
    async () => {
      while (nextPage <= lastPage) {
        const page = nextPage;
        nextPage += 1;
        const result = await withRetry(() =>
          fetchExportPage(tab, range, sorting, page, signal),
        );
        pages[page - 1] = result.data;
        fetched += result.data.length;
        onProgress?.({ fetched, total });
      }
    },
  );
  await Promise.all(workers);

  return { rows: pages.flat(), total };
};
