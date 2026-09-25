import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import TimeframeBar from "./TimeframeBar";
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

const renderLog = (
  searchParams = "",
  options: { onUrlUpdate?: OnUrlUpdateFunction } = {},
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    // hasMemory: interactions re-render with the params they just set,
    // matching a real browser's address bar instead of a frozen snapshot.
    <NuqsTestingAdapter searchParams={searchParams} hasMemory {...options}>
      <QueryClientProvider client={client}>
        <TransactionLog />
      </QueryClientProvider>
    </NuqsTestingAdapter>,
  );
};

/** The timeframe presets live in the bar; render both when a flow spans them. */
const renderDashboard = (searchParams = "") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <NuqsTestingAdapter searchParams={searchParams}>
      <QueryClientProvider client={client}>
        <TimeframeBar />
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

  it("keeps whatever sort field is in the url regardless of the payment status filter", async () => {
    // Every column is always rendered now, so there's no tab to fall off of.
    const fetchMock = mockFetch(response());

    renderLog("?status=pending&sort=returnDetail&order=asc");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("sort=returnDetail");
    expect(requested).toContain("order=asc");
  });

  it("fetches immediately with no filters applied", async () => {
    const fetchMock = mockFetch(response());

    renderLog("");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByText("No transactions to show.")).toBeInTheDocument();
    });
  });

  it("forwards fee and pay type filters", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?feeType=PETITION_FILING_FEE&payType=ACH");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("fee=PETITION_FILING_FEE");
    expect(requested).toContain("paymentMethod=ACH");
  });

  it("forwards payment status and transaction status filters", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=failed&transactionStatus=processed");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("status=failed");
    expect(requested).toContain("transactionStatus=processed");
  });

  it("runs a metadata lookup carried in the durable URL", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?feeType=NONATTORNEY_EXAM_REGISTRATION_FEE&metadataKey=email&metadataValue=foo@example.com",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = new URL(
      String(fetchMock.mock.calls[0][0]),
      "http://localhost",
    );
    expect(requested.searchParams.get("metadataKey")).toBe("email");
    expect(requested.searchParams.get("metadataValue")).toBe("foo@example.com");
    expect(screen.getByLabelText("Search by Email")).toHaveValue(
      "foo@example.com",
    );
  });

  it("does not query for a metadata key with no value in the URL", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?feeType=PETITION_FILING_FEE&metadataKey=docketNumber");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("fee=PETITION_FILING_FEE");
    expect(requested).not.toContain("metadataKey");
    expect(requested).not.toContain("metadataValue");
  });

  it("drops the metadata params from the URL when the Fee Type changes", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?feeType=NONATTORNEY_EXAM_REGISTRATION_FEE&metadataKey=email&metadataValue=foo",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fetchMock.mockClear();

    await userEvent.click(screen.getByLabelText("Fee Type"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Petition Filing Fee" }),
    );

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes("fee=PETITION_FILING_FEE"),
        ),
      ).toBe(true),
    );
    const petitionRequest = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .find((url) => url.includes("fee=PETITION_FILING_FEE"));
    expect(petitionRequest).not.toContain("metadataKey");
    expect(petitionRequest).not.toContain("metadataValue");
  });

  it("changing the timeframe while a filter is active keeps the filter and updates the range", async () => {
    const fetchMock = mockFetch(response());

    renderDashboard("?feeType=PETITION_FILING_FEE&range=today");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const firstRequest = new URL(
      String(fetchMock.mock.calls[0][0]),
      "http://localhost",
    );
    const firstFrom = firstRequest.searchParams.get("from");

    await userEvent.click(
      screen.getByRole("button", { name: "Last 7 days" }),
    );

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) => {
          const url = new URL(String(call[0]), "http://localhost");
          return (
            url.searchParams.get("from") !== firstFrom &&
            url.searchParams.get("fee") === "PETITION_FILING_FEE"
          );
        }),
      ).toBe(true),
    );
  });

  it("forwards a custom timeframe together with active filters", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?range=custom&from=07/01/2026&to=07/10/2026&transactionStatus=processed",
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

  describe("Payment Status filter", () => {
    it("selecting a status option re-fetches with the new status", async () => {
      const fetchMock = mockFetch(response());

      renderLog("");
      await screen.findByText("Failed (0)");

      await userEvent.click(screen.getByText("Failed (0)"));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      const requested = String(fetchMock.mock.calls[1][0]);
      expect(requested).toContain("status=failed");
    });

    it("shows each option's count from the timeframe-wide totals", async () => {
      mockFetch(
        response({ counts: { all: 12, success: 5, failed: 4, pending: 3 } }),
      );

      renderLog("");

      await waitFor(() => {
        expect(screen.getByText("All Payment Status (12)")).toBeInTheDocument();
        expect(screen.getByText("Successful (5)")).toBeInTheDocument();
        expect(screen.getByText("Failed (4)")).toBeInTheDocument();
        expect(screen.getByText("Pending (3)")).toBeInTheDocument();
      });
    });

    it("disables Clear All until a filter is active, then resets on click", async () => {
      const fetchMock = mockFetch(response());

      renderLog("?feeType=PETITION_FILING_FEE");

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Clear All" }),
        ).toBeEnabled(),
      );

      fetchMock.mockClear();
      await userEvent.click(screen.getByRole("button", { name: "Clear All" }));

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Clear All" }),
        ).toBeDisabled(),
      );
    });
  });

  describe("legacy paymentStatus URL fallback", () => {
    it("filters using the old paymentStatus param when status is absent", async () => {
      const fetchMock = mockFetch(response());

      renderLog("?paymentStatus=failed");

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const requested = String(fetchMock.mock.calls[0][0]);
      expect(requested).toContain("status=failed");
    });

    it("normalizes the URL to `status` and clears the legacy key on interaction", async () => {
      mockFetch(response());
      const onUrlUpdate = vi.fn();

      renderLog("?paymentStatus=failed", { onUrlUpdate });

      await waitFor(() => {
        expect(screen.getByText("Failed (0)")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText("Pending (0)"));

      await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
      const last = onUrlUpdate.mock.calls.at(-1)?.[0] as {
        searchParams: URLSearchParams;
      };
      expect(last.searchParams.get("status")).toBe("pending");
      expect(last.searchParams.get("paymentStatus")).toBeNull();
    });
  });
});
