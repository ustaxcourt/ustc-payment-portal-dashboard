import { NextResponse } from "next/server";
import { getSigned } from "@/lib/paymentPortalApi";
import { hasDashboardSession } from "@/lib/serverSession";

// Per-request: a cached response would serve one user's timeframe to another.
export const dynamic = "force-dynamic";

const FORWARDED = [
  "from",
  "to",
  "status",
  "page",
  "pageSize",
  "sort",
  "order",
  "fee",
  "paymentMethod",
  "transactionStatus",
  "metadataKey",
  "metadataValue",
  "export",
  "includeFeeBreakdown",
] as const;

// Mirrors the API's caps; the API remains the authority.
const MAX_PAGE_SIZE = 200;
const MAX_EXPORT_PAGE_SIZE = 5000;

export async function GET(request: Request) {
  if (!(await hasDashboardSession())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const incoming = new URL(request.url).searchParams;
  const forwarded = new URLSearchParams();
  for (const key of FORWARDED) {
    const value = incoming.get(key);
    if (value !== null) {
      forwarded.set(key, value);
    }
  }

  const requestedPage = Number(incoming.get("page") ?? "1");
  forwarded.set(
    "page",
    String(
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    ),
  );
  const maxPageSize =
    incoming.get("export") === "true" ? MAX_EXPORT_PAGE_SIZE : MAX_PAGE_SIZE;
  const requestedPageSize = Number(incoming.get("pageSize") ?? "200");
  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(maxPageSize, requestedPageSize)
      : 200;
  forwarded.set("pageSize", String(pageSize));

  try {
    const upstream = await getSigned("/transaction-log", forwarded);
    const body = await upstream.text();

    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[dashboard] transaction log request failed:", err);
    return NextResponse.json(
      { message: "Unable to reach the transaction log" },
      { status: 502 },
    );
  }
}
