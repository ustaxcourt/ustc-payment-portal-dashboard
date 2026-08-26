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
  priorYear: {
    day: { from: "2025-02-18T05:00:00.000Z", to: "2025-02-18T20:00:00.000Z", total: 3800, hasData: true },
    week: { from: "2025-02-15T05:00:00.000Z", to: "2025-02-18T20:00:00.000Z", total: 20000, hasData: true },
    month: { from: "2025-02-01T05:00:00.000Z", to: "2025-02-18T20:00:00.000Z", total: 96500, hasData: true },
    quarter: { from: "2025-01-01T05:00:00.000Z", to: "2025-02-18T20:00:00.000Z", total: 160375, hasData: true },
    fiscalYear: { from: "2024-10-01T04:00:00.000Z", to: "2025-02-18T20:00:00.000Z", total: 488450, hasData: true },
  },
});

const totalsWithoutPriorYear = (): TotalsResponse => ({
  ...totals(),
  priorYear: {
    day: { from: "2025-02-18T05:00:00.000Z", to: "2025-02-18T20:00:00.000Z", total: 0, hasData: false },
    week: { from: "2025-02-15T05:00:00.000Z", to: "2025-02-18T20:00:00.000Z", total: 0, hasData: false },
    month: { from: "2025-02-01T05:00:00.000Z", to: "2025-02-18T20:00:00.000Z", total: 0, hasData: false },
    quarter: { from: "2025-01-01T05:00:00.000Z", to: "2025-02-18T20:00:00.000Z", total: 0, hasData: false },
    fiscalYear: { from: "2024-10-01T04:00:00.000Z", to: "2025-02-18T20:00:00.000Z", total: 0, hasData: false },
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
        name: "Year-over-Year Change (FY26 vs FY25)",
      }),
    ).toBeInTheDocument();
  });

  it("renders a trend cell per period against the prior fiscal year", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => totals() }),
    );

    renderTotals();

    expect(await screen.findByText(hasText("▲ +$700.00"))).toBeInTheDocument();
    expect(screen.getByText(hasText("▲ +$2,000.00"))).toBeInTheDocument();
    expect(screen.getByText(hasText("▲ +$1,625.00"))).toBeInTheDocument();
    expect(screen.getByText(hasText("▼ -$1,875.00"))).toBeInTheDocument();
    expect(screen.getByText(hasText("▼ -$29,950.00"))).toBeInTheDocument();
  });

  it("shows N/A when there is no prior-year data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => totalsWithoutPriorYear(),
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
