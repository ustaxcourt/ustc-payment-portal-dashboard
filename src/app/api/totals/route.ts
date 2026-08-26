import { NextResponse } from "next/server";
import type { TotalsSnapshot } from "@/features/revenue-totals/types";
import { getSigned } from "@/lib/paymentPortalApi";
import { hasDashboardSession } from "@/lib/serverSession";
import { TOTAL_PERIODS } from "@/features/revenue-totals/types";
import type { TotalPeriod } from "@/features/revenue-totals/types";
import type {
  TransactionLogEntry,
  TransactionLogResponse,
} from "@/features/transaction-log/types";

// Per-request: the periods are relative to now, so a cached response goes stale.
export const dynamic = "force-dynamic";

// The log rows are discarded; only the aggregate is wanted.
const UPSTREAM_QUERY = { includeTotals: "true", pageSize: "1" };
const EXPORT_PAGE_SIZE = 5000;

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

const isTransactionEntry = (value: unknown): value is TransactionLogEntry => {
  if (!value || typeof value !== "object") return false;
  const { paymentStatus, transactionAmount } =
    value as Partial<TransactionLogEntry>;
  return (
    typeof paymentStatus === "string" && typeof transactionAmount === "number"
  );
};

const isTransactionPage = (value: unknown): value is TransactionLogResponse => {
  if (!value || typeof value !== "object") return false;
  const { data, page, pageSize } = value as Partial<TransactionLogResponse>;
  return (
    Array.isArray(data) &&
    data.every(isTransactionEntry) &&
    typeof page === "number" &&
    typeof pageSize === "number"
  );
};

const shiftIsoYear = (iso: string, years: number): string => {
  const shifted = new Date(iso);
  shifted.setUTCFullYear(shifted.getUTCFullYear() + years);
  return shifted.toISOString();
};

const previousRangeFor = ({
  from,
  to,
}: TotalPeriod): Pick<TotalPeriod, "from" | "to"> => ({
  from: shiftIsoYear(from, -1),
  to: shiftIsoYear(to, -1),
});

const fetchSuccessfulTotalForRange = async (
  range: Pick<TotalPeriod, "from" | "to">,
): Promise<number> => {
  let page = 1;
  let total = 0;

  while (true) {
    const upstream = await getSigned(
      "/transaction-log",
      new URLSearchParams({
        export: "true",
        from: range.from,
        order: "asc",
        page: String(page),
        pageSize: String(EXPORT_PAGE_SIZE),
        sort: "createdAt",
        to: range.to,
      }),
    );

    if (!upstream.ok) {
      console.error(
        `[dashboard] previous totals upstream responded ${upstream.status}`,
      );
      throw new Error("Unable to load the previous totals");
    }

    const body: unknown = await upstream.json();
    if (!isTransactionPage(body)) {
      console.error(
        "[dashboard] previous totals response missing transaction data",
      );
      throw new Error("Unable to load the previous totals");
    }

    total += body.data.reduce(
      (sum, entry) =>
        entry.paymentStatus === "success" ? sum + entry.transactionAmount : sum,
      0,
    );

    if (body.data.length === 0 || body.data.length < body.pageSize) {
      return total;
    }

    if (typeof body.total === "number" && page * body.pageSize >= body.total) {
      return total;
    }

    page += 1;
  }
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
      console.error(`[dashboard] totals upstream responded ${upstream.status}`);
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
      console.error(
        "[dashboard] totals missing or malformed on the transaction log",
      );
      return NextResponse.json(
        { message: "Unable to load the totals" },
        { status: 502 },
      );
    }

    const current = totals as TotalsSnapshot;
    const previous = Object.fromEntries(
      await Promise.all(
        TOTAL_PERIODS.map(async (period) => {
          const range = previousRangeFor(current[period]);
          const total = await fetchSuccessfulTotalForRange(range);

          return [period, { ...range, total }] as const;
        }),
      ),
    ) as TotalsSnapshot;

    return NextResponse.json({ current, previous });
  } catch (err) {
    console.error("[dashboard] totals request failed:", err);
    return NextResponse.json(
      { message: "Unable to reach the totals" },
      { status: 502 },
    );
  }
}
