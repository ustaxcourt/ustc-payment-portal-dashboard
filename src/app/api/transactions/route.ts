import { NextResponse } from "next/server";
import { getSigned } from "@/lib/paymentPortalApi";
import { hasDashboardSession } from "@/lib/serverSession";

// Per-request: a cached response would serve one user's timeframe to another.
export const dynamic = "force-dynamic";

const FORWARDED = ["from", "to", "status", "page", "pageSize"] as const;

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
