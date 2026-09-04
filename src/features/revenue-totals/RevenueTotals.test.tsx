import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RevenueTotals from "./RevenueTotals";
import type { TotalsResponse } from "./types";

const NOW = "2026-02-18T20:00:00.000Z";

const totals = (): TotalsResponse => ({
  current: {
    day: { from: "2026-02-18T05:00:00.000Z", to: NOW, total: 4500 },
    week: { from: "2026-02-15T05:00:00.000Z", to: NOW, total: 22000 },
    month: { from: "2026-02-01T05:00:00.000Z", to: NOW, total: 98125 },
    quarter: { from: "2026-01-01T05:00:00.000Z", to: NOW, total: 158500 },
    fiscalYear: { from: "2025-10-01T04:00:00.000Z", to: NOW, total: 458500 },
  },
  yoyTrends: {
    day: { current: 4500, previous: 3800, difference: 700, percentChange: 18.42 },
    week: { current: 22000, previous: 20000, difference: 2000, percentChange: 10 },
    month: { current: 98125, previous: 96500, difference: 1625, percentChange: 1.68 },
    quarter: { current: 158500, previous: 160375, difference: -1875, percentChange: -1.17 },
    fiscalYear: { current: 458500, previous: 488450, difference: -29950, percentChange: -6.13 },
  },
});

const totalsWithoutYoYHistory = (): TotalsResponse => ({
  ...totals(),
  yoyTrends: {
    day: { current: 4500, previous: 0, difference: 4500, percentChange: null },
    week: { current: 22000, previous: 0, difference: 22000, percentChange: null },
    month: { current: 98125, previous: 0, difference: 98125, percentChange: null },
    quarter: { current: 158500, previous: 0, difference: 158500, percentChange: null },
    fiscalYear: { current: 458500, previous: 0, difference: 458500, percentChange: null },
  },
});

const renderTotals = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <RevenueTotals />
    </QueryClientProvider>,
  );
};

const hasText = (expected: string) => (_: string, element: Element | null) =>
  element?.textContent?.replace(/\s+/g, " ").trim() === expected;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RevenueTotals", () => {
  it("renders a figure per period", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => totals() }),
    );

    renderTotals();

    await waitFor(() => {
      expect(screen.getByText("$4,500.00")).toBeInTheDocument();
    });
    expect(screen.getByText("$458,500.00")).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", {
        name: "YoY Trend (FY26 vs FY25)",
      }),
    ).toBeInTheDocument();
  });

  it("renders a trend cell per period against the prior fiscal year", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => totals() }),
    );

    renderTotals();

    expect(await screen.findByText(hasText("▲ +$700.00 (18%)"))).toBeInTheDocument();
    expect(screen.getByText(hasText("▲ +$2,000.00 (10%)"))).toBeInTheDocument();
    expect(screen.getByText(hasText("▲ +$1,625.00 (2%)"))).toBeInTheDocument();
    expect(screen.getByText(hasText("▼ -$1,875.00 (1%)"))).toBeInTheDocument();
    expect(screen.getByText(hasText("▼ -$29,950.00 (6%)"))).toBeInTheDocument();
  });

  it("renders Projected Total as the third row, per the AC", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => totals() }),
    );

    renderTotals();

    await screen.findByText("$4,500.00");
    const rowHeaders = screen.getAllByRole("rowheader");
    expect(rowHeaders.map((header) => header.textContent)).toEqual([
      "Current Total",
      "YoY Trend (FY26 vs FY25)",
      "Projected Total, estimated from the rate collected so far",
    ]);
  });

  it("projects each period over its full length, in whole dollars", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => totals() }),
    );

    renderTotals();

    // Day: $4,500 over 15 of 24 hours. Week: $22,000 over 87 of 168 hours.
    expect(await screen.findByText("$7,200")).toBeInTheDocument();
    expect(screen.getByText("$42,483")).toBeInTheDocument();
  });

  it("projects a period with nothing collected as $0", async () => {
    const body = totals();
    body.current.day.total = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body }),
    );

    renderTotals();

    expect(await screen.findByText("$0")).toBeInTheDocument();
  });

  it("shows N/A when the upstream trend has no prior-year baseline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => totalsWithoutYoYHistory(),
      }),
    );

    renderTotals();

    expect(await screen.findAllByText("N/A")).toHaveLength(5);
    expect(screen.getByText("$458,500.00")).toBeInTheDocument();
  });

  // "Q2" and "FY26" name a period without saying when it opened, so the AC's
  // start and end dates have to be on screen for them.
  it("prints the window under the periods that are named, not dated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => totals() }),
    );

    renderTotals();

    expect(
      await screen.findByText("Jan 1, 2026 to Feb 18, 2026"),
    ).toBeInTheDocument();
    expect(screen.getByText("Oct 1, 2025 to Feb 18, 2026")).toBeInTheDocument();
    expect(screen.getByText("Feb 1, 2026 to Feb 18, 2026")).toBeInTheDocument();
  });

  it("leaves the dated periods without a repeated window", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => totals() }),
    );

    renderTotals();

    // The day and week subtitles already carry their dates.
    expect(
      await screen.findByRole("columnheader", { name: "Today - Feb 18, 2026" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", {
        name: "Week - Feb 15, 2026 – Feb 18, 2026",
      }),
    ).toBeInTheDocument();
  });

  it("shows the retry affordance when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) }),
    );

    renderTotals();

    expect(
      await screen.findByText("Could not load the revenue totals."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});
