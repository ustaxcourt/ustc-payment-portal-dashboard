import { NextResponse } from "next/server";
import { getSigned } from "@/lib/paymentPortalApi";
import { hasDashboardSession } from "@/lib/serverSession";
import { TOTAL_PERIODS } from "@/features/revenue-totals/types";
import type { TotalPeriod } from "@/features/revenue-totals/types";

// Per-request: the periods are relative to now, so a cached response goes stale.
export const dynamic = "force-dynamic";

// The log rows are discarded; only the aggregate is wanted.
const UPSTREAM_QUERY = { includeTotals: "true", pageSize: "1" };

/**
 * Presence is not enough: an unparseable `from` or `to` reaches `Intl.format`,
 * which throws `RangeError: Invalid time value` mid-render rather than failing
 * here where it can be reported.
 */
const isPeriod = (value: unknown): value is TotalPeriod => {
  if (!value || typeof value !== "object") return false;
  const { from, to, total } = value as Partial<TotalPeriod>;

  return (
    typeof total === "number" &&
    typeof from === "string" &&
    typeof to === "string" &&
    !Number.isNaN(Date.parse(from)) &&
    !Number.isNaN(Date.parse(to))
  );
};

export async function GET() {
  if (!(await hasDashboardSession())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const upstream = await getSigned(
      "/transaction-log",
      new URLSearchParams(UPSTREAM_QUERY),
    );

    if (!upstream.ok) {
      // Status only: the body is not ours to log, and 403/400/500 already
      // separate an IAM problem from a bad parameter from an upstream fault.
      console.error(
        `[dashboard] totals upstream responded ${upstream.status}`,
      );
      return NextResponse.json(
        { message: "Unable to load the totals" },
        { status: 502 },
      );
    }

    const body = await upstream.json();

    // `totals` is optional upstream, so the optionality is resolved here rather
    // than left for the components to guard.
    const totals = body?.totals;
    if (!totals || TOTAL_PERIODS.some((period) => !isPeriod(totals[period]))) {
      console.error("[dashboard] totals missing or malformed on the transaction log");
      return NextResponse.json(
        { message: "Unable to load the totals" },
        { status: 502 },
      );
    }

    return NextResponse.json(totals);
  } catch (err) {
    console.error("[dashboard] totals request failed:", err);
    return NextResponse.json(
      { message: "Unable to reach the totals" },
      { status: 502 },
    );
  }
}
