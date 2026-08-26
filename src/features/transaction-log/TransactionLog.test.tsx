import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("falls back when the sorted column is absent from the tab", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=pending&sort=returnDetail&order=asc");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("sort=createdAt");
    expect(requested).toContain("order=desc");
    expect(requested).not.toContain("returnDetail");
  });

  it("renders the Search tab", async () => {
    mockFetch(response());

    renderLog("");

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Search" })).toBeInTheDocument();
    });
  });

  it("forwards fee and pay type filters when searching", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?status=search&feeType=PETITION_FILING_FEE&payType=ACH",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("fee=PETITION_FILING_FEE");
    expect(requested).toContain("paymentMethod=ACH");
    expect(requested).not.toContain("status=search");
  });

  it("forwards payment status and transaction status filters when searching", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?status=search&paymentStatus=failed&transactionStatus=processed",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("status=failed");
    expect(requested).toContain("transactionStatus=processed");
  });

  it("keeps the sort when switching to search, since its columns match the other tabs", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?status=search&sort=clientName&order=asc&feeType=PETITION_FILING_FEE",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("sort=clientName");
    expect(requested).toContain("order=asc");
  });

  it("does not query when the search tab has no filter yet", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=search");

    await waitFor(() => {
      expect(
        screen.getByText(
          "Choose a filter to search transactions.",
        ),
      ).toBeInTheDocument();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["feeType=PETITION_FILING_FEE", "fee=PETITION_FILING_FEE"],
    ["payType=ACH", "paymentMethod=ACH"],
    ["paymentStatus=failed", "status=failed"],
    ["transactionStatus=processed", "transactionStatus=processed"],
  ])(
    "starts querying as soon as %s is set, with no other filter present",
    async (param, expectedQuery) => {
      const fetchMock = mockFetch(response());

      renderLog(`?status=search&${param}`);

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const requested = String(fetchMock.mock.calls[0][0]);
      expect(requested).toContain(expectedQuery);
    },
  );

  it("changing the timeframe while a filter is active keeps the filter and updates the range", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=search&feeType=PETITION_FILING_FEE&range=today");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const firstRequest = new URL(
      String(fetchMock.mock.calls[0][0]),
      "http://localhost",
    );
    const firstFrom = firstRequest.searchParams.get("from");

    await userEvent.click(
      screen.getByRole("button", { name: "Last 7 days" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondRequest = new URL(
      String(fetchMock.mock.calls[1][0]),
      "http://localhost",
    );

    expect(secondRequest.searchParams.get("fee")).toBe(
      "PETITION_FILING_FEE",
    );
    expect(secondRequest.searchParams.get("from")).not.toBe(firstFrom);
  });

  it("forwards a custom timeframe together with search filters", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?status=search&range=custom&from=07/01/2026&to=07/10/2026&transactionStatus=processed",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = new URL(
      String(fetchMock.mock.calls[0][0]),
      "http://localhost",
    );
    expect(requested.searchParams.get("from")).toBe(
      "2026-07-01T04:00:00.000Z",
    );
    expect(requested.searchParams.get("to")).toBe("2026-07-11T04:00:00.000Z");
    expect(requested.searchParams.get("transactionStatus")).toBe("processed");
  });

  it("does not carry over the previous tab's totals onto an empty search", async () => {
    const fetchMock = mockFetch(
      response({
        data: [],
        total: 4213,
        from: "2026-08-20T04:00:00.000Z",
        to: "2026-08-21T04:00:00.000Z",
      }),
    );

    renderLog("?status=all");

    await waitFor(() => {
      expect(screen.getByText(/of 4213 transactions/)).toBeInTheDocument();
    });

    fetchMock.mockClear();

    await userEvent.click(screen.getByRole("tab", { name: "Search" }));

    await waitFor(() => {
      expect(
        screen.getByText("Choose a filter to search transactions."),
      ).toBeInTheDocument();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/of 4213 transactions/)).not.toBeInTheDocument();
  });

  it("only shows Clear All on the search tab", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=all");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(
      screen.queryByRole("button", { name: "Clear All" }),
    ).not.toBeInTheDocument();
  });

  it("clears search filters when Clear All is clicked", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?status=search&feeType=PETITION_FILING_FEE&payType=ACH&paymentStatus=failed&transactionStatus=processed",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fetchMock.mockClear();

    await userEvent.click(
      screen.getByRole("button", { name: "Clear All" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "Choose a filter to search transactions.",
        ),
      ).toBeInTheDocument();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
