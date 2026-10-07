import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppliedDateRange } from "./dateRange";
import {
  EXPORT_PAGE_SIZE,
  EXPORT_ROW_LIMIT,
  ExportTooLargeError,
  fetchAllTransactions,
} from "./exportTransactions";
import type { TransactionLogEntry, TransactionSorting } from "./types";

const range: AppliedDateRange = {
  preset: "today",
  from: "08/17/2026",
  to: "08/17/2026",
  label: "Today",
};

const sorting: TransactionSorting = { sort: "createdAt", order: "desc" };

const row = (id: number): TransactionLogEntry => ({
  agencyTrackingId: `agency-${id}`,
  feeName: "Filing Fee",
  fee: "PETITION_FILING_FEE",
  transactionAmount: 60,
  clientName: "payment-portal",
  transactionReferenceId: `ref-${id}`,
  paymentStatus: "success",
  createdAt: "2026-08-17T12:00:00.000Z",
  lastUpdatedAt: "2026-08-17T13:00:00.000Z",
});

const ids = (start: number, count: number) =>
  Array.from({ length: count }, (_, i) => start + i);

const pageResponse = (ids: number[], total?: number) => ({
  ok: true,
  json: async () => ({
    data: ids.map(row),
    from: "2026-08-17T04:00:00.000Z",
    to: "2026-08-18T04:00:00.000Z",
    page: 1,
    pageSize: EXPORT_PAGE_SIZE,
    sort: "createdAt",
    order: "desc",
    ...(total !== undefined && {
      total,
      counts: { all: total, success: total, failed: 0, pending: 0 },
    }),
  }),
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAllTransactions", () => {
  it("sends the export params and returns a single page's rows", async () => {
    const fetch = vi.fn().mockResolvedValue(pageResponse([1, 2, 3], 3));
    vi.stubGlobal("fetch", fetch);

    const result = await fetchAllTransactions("all", range, sorting);

    expect(result.rows.map((r) => r.agencyTrackingId)).toEqual([
      "agency-1",
      "agency-2",
      "agency-3",
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = new URL(fetch.mock.calls[0][0], "http://localhost");
    expect(url.searchParams.get("export")).toBe("true");
    expect(url.searchParams.get("pageSize")).toBe(String(EXPORT_PAGE_SIZE));
    expect(url.searchParams.get("status")).toBeNull();
  });

  it("passes the status filter for a filtered tab", async () => {
    const fetch = vi.fn().mockResolvedValue(pageResponse([1], 1));
    vi.stubGlobal("fetch", fetch);

    await fetchAllTransactions("failed", range, sorting);

    const url = new URL(fetch.mock.calls[0][0], "http://localhost");
    expect(url.searchParams.get("status")).toBe("failed");
  });

  it("assembles pages in page order even when responses arrive out of order", async () => {
    const total = EXPORT_PAGE_SIZE * 2 + 1;
    const fetch = vi.fn().mockImplementation(async (input: string) => {
      const page = Number(
        new URL(input, "http://localhost").searchParams.get("page"),
      );
      if (page === 2) {
        // Hold page 2 back so page 3 lands first.
        await new Promise((resolve) => setTimeout(resolve, 20));
        return pageResponse(ids(EXPORT_PAGE_SIZE + 1, EXPORT_PAGE_SIZE));
      }
      if (page === 3) return pageResponse(ids(EXPORT_PAGE_SIZE * 2 + 1, 1));
      return pageResponse(ids(1, EXPORT_PAGE_SIZE), total);
    });
    vi.stubGlobal("fetch", fetch);

    const result = await fetchAllTransactions("all", range, sorting);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.rows).toHaveLength(total);
    // The page-2 rows sit between page 1's last and page 3's row.
    expect(result.rows[EXPORT_PAGE_SIZE - 1].agencyTrackingId).toBe(
      `agency-${EXPORT_PAGE_SIZE}`,
    );
    expect(result.rows[EXPORT_PAGE_SIZE].agencyTrackingId).toBe(
      `agency-${EXPORT_PAGE_SIZE + 1}`,
    );
    expect(result.rows.at(-1)?.agencyTrackingId).toBe(`agency-${total}`);
    expect(result.total).toBe(total);
  });

  it("fails loudly when page 1 omits the total instead of truncating", async () => {
    const fetch = vi.fn().mockResolvedValue(pageResponse([1, 2, 3]));
    vi.stubGlobal("fetch", fetch);

    await expect(fetchAllTransactions("all", range, sorting)).rejects.toThrow(
      "missing its total row count",
    );
  });

  it("refuses an export above the row limit before fetching further pages", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(pageResponse([1], EXPORT_ROW_LIMIT + 1));
    vi.stubGlobal("fetch", fetch);

    await expect(fetchAllTransactions("all", range, sorting)).rejects.toThrow(
      ExportTooLargeError,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a failed page once", async () => {
    const total = EXPORT_PAGE_SIZE + 1;
    let failures = 0;
    const fetch = vi.fn().mockImplementation(async (input: string) => {
      const page = Number(
        new URL(input, "http://localhost").searchParams.get("page"),
      );
      if (page === 2 && failures === 0) {
        failures += 1;
        return { ok: false, status: 502 };
      }
      return page === 1
        ? pageResponse(ids(1, EXPORT_PAGE_SIZE), total)
        : pageResponse(ids(EXPORT_PAGE_SIZE + 1, 1));
    });
    vi.stubGlobal("fetch", fetch);

    const result = await fetchAllTransactions("all", range, sorting);

    expect(result.rows).toHaveLength(total);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("refetches once when the row set shifts mid-export", async () => {
    const total = EXPORT_PAGE_SIZE + 2;
    let attempt = 0;
    const fetch = vi.fn().mockImplementation(async (input: string) => {
      const page = Number(
        new URL(input, "http://localhost").searchParams.get("page"),
      );
      if (page === 1) {
        attempt += 1;
        return pageResponse(ids(1, EXPORT_PAGE_SIZE), total);
      }
      // First attempt: page 2 comes up one row short (a row moved).
      return attempt === 1
        ? pageResponse(ids(EXPORT_PAGE_SIZE + 1, 1))
        : pageResponse(ids(EXPORT_PAGE_SIZE + 1, 2));
    });
    vi.stubGlobal("fetch", fetch);

    const result = await fetchAllTransactions("all", range, sorting);

    expect(result.rows).toHaveLength(total);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("reports progress as pages land", async () => {
    const total = EXPORT_PAGE_SIZE + 1;
    const fetch = vi.fn().mockImplementation(async (input: string) => {
      const page = Number(
        new URL(input, "http://localhost").searchParams.get("page"),
      );
      return page === 1
        ? pageResponse(ids(1, EXPORT_PAGE_SIZE), total)
        : pageResponse(ids(EXPORT_PAGE_SIZE + 1, 1));
    });
    vi.stubGlobal("fetch", fetch);
    const onProgress = vi.fn();

    await fetchAllTransactions("all", range, sorting, { onProgress });

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls.at(-1)?.[0]).toEqual({
      fetched: total,
      total,
    });
  });
});
