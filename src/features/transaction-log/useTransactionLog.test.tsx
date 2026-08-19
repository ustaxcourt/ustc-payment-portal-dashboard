import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppliedDateRange } from "./dateRange";
import { useTransactionLog } from "./useTransactionLog";
import type {
  TransactionLogEntry,
  TransactionLogResponse,
  TransactionSorting,
} from "./types";

const range: AppliedDateRange = {
  preset: "last7",
  from: "08/12/2026",
  to: "08/18/2026",
  label: "Last 7 days",
};

const sorting: TransactionSorting = { sort: "createdAt", order: "desc" };

const entry = (id: string): TransactionLogEntry => ({
  agencyTrackingId: id,
  feeName: "Filing fee",
  fee: "1",
  transactionAmount: 100,
  clientName: "Client",
  transactionReferenceId: id,
  paymentStatus: "success",
  createdAt: "2026-08-18T00:00:00.000Z",
  lastUpdatedAt: "2026-08-18T00:00:00.000Z",
});

const response = (
  overrides: Partial<TransactionLogResponse> = {},
): TransactionLogResponse => ({
  data: [],
  counts: { all: 0, success: 0, failed: 0, pending: 0 },
  from: range.from,
  to: range.to,
  page: 1,
  pageSize: 200,
  sort: "createdAt",
  order: "desc",
  total: 0,
  ...overrides,
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTransactionLog", () => {
  it("throws when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    const { result } = renderHook(
      () => useTransactionLog("all", range, sorting),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(
      new Error("Request failed with 500"),
    );
  });

  it("walks and merges every page when the first page doesn't cover the total", async () => {
    const firstPageData = Array.from({ length: 2 }, (_, index) =>
      entry(`first-${index}`),
    );
    const secondPageData = [entry("second-0")];

    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      const url = new URL(input, "http://localhost");
      const page = url.searchParams.get("page");
      const body =
        page === "2"
          ? response({ data: secondPageData, page: 2, pageSize: 2, total: 3 })
          : response({ data: firstPageData, page: 1, pageSize: 2, total: 3 });

      return { ok: true, status: 200, json: async () => body };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () => useTransactionLog("all", range, sorting),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.data?.data).toEqual([
      ...firstPageData,
      ...secondPageData,
    ]);
    expect(result.current.data?.page).toBe(1);
    expect(result.current.data?.pageSize).toBe(2);
  });
});
