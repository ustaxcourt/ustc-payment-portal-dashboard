import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import TransactionLog from "./TransactionLog";
import type { TransactionLogResponse } from "./types";

const response = (
  overrides: Partial<TransactionLogResponse> = {},
): TransactionLogResponse => ({
  data: [],
  counts: { all: 0, success: 0, failed: 0, pending: 0 },
  from: "2026-08-03T04:00:00.000Z",
  to: "2026-08-04T04:00:00.000Z",
  page: 1,
  pageSize: 200,
  sort: "createdAt",
  order: "desc",
  total: 0,
  ...overrides,
});

const renderLog = (searchParams = "") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <NuqsTestingAdapter searchParams={searchParams}>
      <QueryClientProvider client={client}>
        <TransactionLog />
      </QueryClientProvider>
    </NuqsTestingAdapter>,
  );
};

const mockFetch = (body: TransactionLogResponse) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TransactionLog", () => {
  // The rows reorder after a round trip, so without this the change is silent
  // to anyone not watching the screen.
  it("announces the order the server confirms", async () => {
    mockFetch(response({ sort: "transactionAmount", order: "desc" }));

    renderLog("?sort=transactionAmount&order=desc");

    await waitFor(() => {
      expect(
        screen.getByText("Sorted by Amount, descending"),
      ).toBeInTheDocument();
    });
  });

  it("announces an ascending order in words, not a symbol", async () => {
    mockFetch(response({ sort: "clientName", order: "asc" }));

    renderLog("?sort=clientName&order=asc");

    await waitFor(() => {
      expect(screen.getByText("Sorted by Client, ascending")).toBeInTheDocument();
    });
  });

  it("asks the api for the ordering held in the url", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=failed&sort=feeName&order=asc");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("sort=feeName");
    expect(requested).toContain("order=asc");
    expect(requested).toContain("status=failed");
  });

  // Failure reason is not rendered on the Pending tab, so a sort held over from
  // another tab would otherwise order the table by a column nobody can see.
  it("falls back when the sorted column is absent from the tab", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=pending&sort=returnDetail&order=asc");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("sort=createdAt");
    expect(requested).toContain("order=desc");
    expect(requested).not.toContain("returnDetail");
  });
});
