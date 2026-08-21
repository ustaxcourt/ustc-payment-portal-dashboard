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

  it("forwards fee, pay type, and lookup filters when searching", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?status=search&feeType=PETITION_FILING_FEE&payType=ACH&lookupType=agencyId&lookupValue=26PHF07R",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("fee=PETITION_FILING_FEE");
    expect(requested).toContain("paymentMethod=ACH");
    expect(requested).toContain("lookupType=agencyId");
    expect(requested).toContain("lookupValue=26PHF07R");
    expect(requested).not.toContain("status=search");
  });

  it("falls back to the default sort when switching to search with an unsupported field", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?status=search&sort=clientName&order=asc&lookupValue=Inez",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("sort=createdAt");
    expect(requested).toContain("order=desc");
  });

  it("does not query when the search tab has no filter or lookup value yet", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=search");

    await waitFor(() => {
      expect(
        screen.getByText(
          "Choose a fee type, pay type, or lookup value to search transactions.",
        ),
      ).toBeInTheDocument();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("starts querying as soon as a lookup value is entered", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=search&lookupValue=26PHF07R");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("lookupValue=26PHF07R");
  });

  it("only shows Clear Filters/Search on the search tab", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=all");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(
      screen.queryByRole("button", { name: "Clear Filters/Search" }),
    ).not.toBeInTheDocument();
  });

  it("clears search filters when Clear Filters/Search is clicked", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?status=search&feeType=PETITION_FILING_FEE&lookupValue=26PHF07R",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fetchMock.mockClear();

    await userEvent.click(
      screen.getByRole("button", { name: "Clear Filters/Search" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "Choose a fee type, pay type, or lookup value to search transactions.",
        ),
      ).toBeInTheDocument();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
