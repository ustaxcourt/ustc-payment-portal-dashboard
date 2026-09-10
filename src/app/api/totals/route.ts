import { NextResponse } from "next/server";
import type {
  TotalsSnapshot,
  YoYTrend,
  YoYTrendSnapshot,
} from "@/features/revenue-totals/types";
import { getSigned } from "@/lib/paymentPortalApi";
import { hasDashboardSession } from "@/lib/serverSession";
import { TOTAL_PERIODS } from "@/features/revenue-totals/types";
import type { TotalPeriod } from "@/features/revenue-totals/types";
import type { FeeBreakdownRow } from "@/features/transaction-log/types";

// Per-request: the periods are relative to now, so a cached response goes stale.
export const dynamic = "force-dynamic";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isFeeRow = (value: unknown): value is FeeBreakdownRow => {
  if (!value || typeof value !== "object") return false;
  const { fee, feeName, qty, subtotal } = value as Partial<FeeBreakdownRow>;

  return (
    typeof fee === "string" &&
    typeof feeName === "string" &&
    isFiniteNumber(qty) &&
    isFiniteNumber(subtotal)
  );
};

const isPeriod = (value: unknown): value is TotalPeriod => {
  if (!value || typeof value !== "object") return false;
  const { from, to, total, fees } = value as Partial<TotalPeriod>;

  return (
    typeof total === "number" &&
    typeof from === "string" &&
    typeof to === "string" &&
    !Number.isNaN(Date.parse(from)) &&
    !Number.isNaN(Date.parse(to)) &&
    Array.isArray(fees) &&
    fees.every(isFeeRow)
  );
};

const isYoYTrend = (value: unknown): value is YoYTrend => {
  if (!value || typeof value !== "object") return false;

  const { current, previous, difference, percentChange } =
    value as Partial<YoYTrend>;

  return (
    isFiniteNumber(current) &&
    (previous === null || isFiniteNumber(previous)) &&
    (difference === null || isFiniteNumber(difference)) &&
    (percentChange === null || isFiniteNumber(percentChange))
  );
};

export async function GET() {
  if (!(await hasDashboardSession())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const upstream = await getSigned("/revenue-summary", new URLSearchParams());

    if (!upstream.ok) {
      // Status only: the body is not ours to log, and 403/400/500 already
      // separate an IAM problem from a bad parameter from an upstream fault.
      console.error(
        `[dashboard] revenue summary upstream responded ${upstream.status}`,
      );
      return NextResponse.json(
        { message: "Unable to load the totals" },
        { status: 502 },
      );
    }

    const body = await upstream.json();
    const totals = body?.totals;
    const yoyTrends = body?.yoyTrends;

    if (!totals || TOTAL_PERIODS.some((period) => !isPeriod(totals[period]))) {
      console.error(
        "[dashboard] totals missing or malformed on the revenue summary",
      );
      return NextResponse.json(
        { message: "Unable to load the totals" },
        { status: 502 },
      );
    }

    const current = totals as TotalsSnapshot;

    let validatedTrends: YoYTrendSnapshot | null = null;

    if (yoyTrends) {
      const valid = TOTAL_PERIODS.every((period) =>
        isYoYTrend(yoyTrends[period]),
      );

      if (!valid) {
        console.warn(
          "[dashboard] yoy trends malformed on the revenue summary; falling back to N/A",
        );
      } else {
        validatedTrends = Object.fromEntries(
          TOTAL_PERIODS.map((period) => [
            period,
            {
              ...yoyTrends[period],
            },
          ]),
        ) as YoYTrendSnapshot;
      }
    }

    const fallbackTrends = Object.fromEntries(
      TOTAL_PERIODS.map((period) => [
        period,
        {
          current: current[period].total,
          previous: null,
          difference: null,
          percentChange: null,
          available: false,
        },
      ]),
    ) as YoYTrendSnapshot;

    return NextResponse.json({
      current,
      yoyTrends: validatedTrends ?? fallbackTrends,
    });
  } catch (err) {
    console.error("[dashboard] totals request failed:", err);
    return NextResponse.json(
      { message: "Unable to reach the totals" },
      { status: 502 },
    );
  }
}
