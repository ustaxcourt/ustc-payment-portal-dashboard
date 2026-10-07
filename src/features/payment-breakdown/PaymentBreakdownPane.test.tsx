import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  FeeBreakdownRow,
  TransactionLogResponse,
} from "../transaction-log/types";
import PaymentBreakdownPane from "./PaymentBreakdownPane";
import { usePaymentBreakdown } from "./usePaymentBreakdown";

const response = (
  overrides: Partial<TransactionLogResponse> = {},
): TransactionLogResponse => ({
  data: [],
  counts: { all: 0, success: 0, failed: 0, pending: 0 },
  from: "2026-08-27T04:00:00.000Z",
  to: "2026-08-28T04:00:00.000Z",
  page: 1,
  pageSize: 1,
  sort: "createdAt",
  order: "desc",
  total: 0,
  ...overrides,
});

const feeBreakdown: FeeBreakdownRow[] = [
  {
    fee: "NONATTORNEY_EXAM_REGISTRATION_FEE",
    feeName: "Non-Attorney Exam Registration Fee",
    qty: 1,
    subtotal: 250,
  },
  {
    fee: "PETITION_FILING_FEE",
    feeName: "Petition Filing Fee",
    qty: 2,
    subtotal: 120,
  },
];

const renderPane = (searchParams = "") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <NuqsTestingAdapter searchParams={searchParams}>
      <QueryClientProvider client={client}>
        <PaymentBreakdownPane />
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

describe("PaymentBreakdownPane", () => {
  it("shows the API's rows and the grand total, largest subtotal first", async () => {
    const fetchMock = mockFetch(response({ feeBreakdown }));

    renderPane();

    expect(
      screen.getByRole("heading", { name: "Payment Breakdown" }),
    ).toBeInTheDocument();

    const examRow = (
      await screen.findByText("Non-Attorney Exam Registration Fee")
    ).closest("tr");
    expect(examRow).toHaveTextContent("1");
    expect(examRow).toHaveTextContent("$250.00");

    const petitionRow = screen.getByText("Petition Filing Fee").closest("tr");
    expect(petitionRow).toHaveTextContent("2");
    expect(petitionRow).toHaveTextContent("$120.00");

    expect(screen.getByTestId("payment-breakdown-total")).toHaveTextContent(
      "Total: $370.00",
    );

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("includeFeeBreakdown=true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails loudly when the API returns no fee breakdown", async () => {
    mockFetch(response());

    renderPane();

    expect(
      await screen.findByText("Could not load the payment breakdown."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The API returned no fee breakdown."),
    ).toBeInTheDocument();
  });

  it("shows dashes, not zeros, for a fee with no payments", async () => {
    mockFetch(
      response({
        feeBreakdown: [
          feeBreakdown[0],
          { ...feeBreakdown[1], qty: 0, subtotal: 0 },
        ],
      }),
    );

    renderPane();

    const petitionRow = (
      await screen.findByText("Petition Filing Fee")
    ).closest("tr");
    expect(petitionRow).toHaveTextContent("—");
    expect(petitionRow).not.toHaveTextContent("$0.00");
    expect(screen.getByTestId("payment-breakdown-total")).toHaveTextContent(
      "Total: $250.00",
    );
  });

  it("re-enters the pending state when the timeframe changes, instead of keeping the previous range's data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => response({ feeBreakdown }),
      })
      .mockImplementationOnce(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result, rerender } = renderHook(
      ({ from, to }) =>
        usePaymentBreakdown({
          preset: "custom",
          from,
          to,
          label: `${from} - ${to}`,
        }),
      { wrapper, initialProps: { from: "2026-08-01", to: "2026-08-07" } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ from: "2026-08-08", to: "2026-08-14" });

    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("shows an error panel when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ message: "Bad gateway" }),
      }),
    );

    renderPane();

    expect(
      await screen.findByText("Could not load the payment breakdown."),
    ).toBeInTheDocument();
  });
});
