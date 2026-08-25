import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCourtDate } from "@/lib/format";
import TimeframeBar from "./TimeframeBar";
import type { TransactionLogEntry, TransactionLogResponse } from "./types";

const entry = (): TransactionLogEntry => ({
  agencyTrackingId: "USTC-1",
  feeName: "Petition Fee",
  fee: "60.00",
  transactionAmount: 60,
  clientName: "Ada Lovelace",
  transactionReferenceId: "ref-1",
  paymentStatus: "success",
  createdAt: "2026-08-03T12:00:00.000Z",
  lastUpdatedAt: "2026-08-03T12:00:00.000Z",
});

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

const renderBar = (
  searchParams = "",
  onUrlUpdate: (event: { queryString: string }) => void = () => {},
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <QueryClientProvider client={client}>
        <TimeframeBar />
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

describe("TimeframeBar", () => {
  it("shows the timeframe presets and the export button", async () => {
    mockFetch(response());
    renderBar();

    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Last 7 days" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Month to date" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Custom range" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Export" }),
    ).toBeInTheDocument();
  });

  it("disables export while the log is empty", async () => {
    mockFetch(response({ data: [], total: 0 }));
    renderBar();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Export" })).toBeDisabled(),
    );
  });

  it("enables export once the log has rows", async () => {
    mockFetch(response({ data: [entry()], total: 1 }));
    renderBar();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Export" })).toBeEnabled(),
    );
  });

  it("shows the server-confirmed date beside the applied preset", async () => {
    mockFetch(response());
    renderBar();

    const applied = formatCourtDate("2026-08-03T04:00:00.000Z");
    expect(await screen.findByText(`Today – ${applied}`)).toBeInTheDocument();
  });

  it("shows no date until the server confirms the window", () => {
    mockFetch(response());
    renderBar();

    expect(screen.queryByText(/–/)).not.toBeInTheDocument();
  });

  it("writes the chosen preset to the URL it shares with the log", async () => {
    mockFetch(response());
    const onUrlUpdate = vi.fn();
    renderBar("", onUrlUpdate);

    await userEvent.click(screen.getByRole("button", { name: "Last 7 days" }));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const { queryString } = onUrlUpdate.mock.calls.at(-1)?.[0] ?? {};
    expect(queryString).toContain("range=last7");
  });
});
