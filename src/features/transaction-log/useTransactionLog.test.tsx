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

  it("fetches a single page even when it doesn't cover the total", async () => {
    // The table deliberately does not walk pages: the footer reports the
    // true total and the export is the path to the complete set.
    const firstPageData = Array.from({ length: 2 }, (_, index) =>
      entry(`first-${index}`),
    );

    const fetchMock = vi.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () =>
        response({ data: firstPageData, page: 1, pageSize: 200, total: 3 }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () => useTransactionLog("all", range, sorting),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0], "http://localhost");
    expect(url.searchParams.get("page")).toBe("1");
    expect(result.current.data?.data).toEqual(firstPageData);
    // The true total stays visible so the footer can point at the export.
    expect(result.current.data?.total).toBe(3);
  });

  it("forwards a non-default range together with an active search filter", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => response(),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const filters = {
      feeType: "PETITION_FILING_FEE" as const,
      payType: null,
      paymentStatus: null,
      transactionStatus: null,
      metadataKey: null,
      metadataValue: null,
    };

    const { result } = renderHook(
      () => useTransactionLog("search", range, sorting, filters, true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0], "http://localhost");
    expect(url.searchParams.get("from")).toBe("2026-08-12T04:00:00.000Z");
    expect(url.searchParams.get("to")).toBe("2026-08-19T04:00:00.000Z");
    expect(url.searchParams.get("fee")).toBe("PETITION_FILING_FEE");
  });

  it("forwards a metadata lookup only when both key and value are set", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => response(),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const base = {
      feeType: "PETITION_FILING_FEE" as const,
      payType: null,
      paymentStatus: null,
      transactionStatus: null,
    };

    const { result, rerender } = renderHook(
      ({ metadataKey, metadataValue }) =>
        useTransactionLog(
          "search",
          range,
          sorting,
          { ...base, metadataKey, metadataValue },
          true,
        ),
      {
        wrapper,
        initialProps: {
          metadataKey: "docketNumber" as const,
          metadataValue: null as string | null,
        },
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    let url = new URL(fetchMock.mock.calls[0][0], "http://localhost");
    expect(url.searchParams.get("metadataKey")).toBeNull();
    expect(url.searchParams.get("metadataValue")).toBeNull();

    rerender({ metadataKey: "docketNumber", metadataValue: "123-26" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    url = new URL(fetchMock.mock.calls[1][0], "http://localhost");
    expect(url.searchParams.get("metadataKey")).toBe("docketNumber");
    expect(url.searchParams.get("metadataValue")).toBe("123-26");
  });
});
