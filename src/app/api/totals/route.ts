import { NextResponse } from "next/server";
import { getSigned } from "@/lib/paymentPortalApi";
import { hasDashboardSession } from "@/lib/serverSession";
import { TOTAL_PERIODS } from "@/features/revenue-totals/types";

// Per-request: the periods are relative to now, so a cached response goes stale.
export const dynamic = "force-dynamic";

// The log rows are discarded; only the aggregate is wanted.
const UPSTREAM_QUERY = { includeTotals: "true", pageSize: "1" };

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
      console.error(
        `[dashboard] totals upstream responded ${upstream.status}`,
        await upstream.text(),
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
    if (!totals || TOTAL_PERIODS.some((period) => !totals[period])) {
      console.error("[dashboard] totals missing from the transaction log");
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
