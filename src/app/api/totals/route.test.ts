// @vitest-environment node
// NextResponse needs the WHATWG Request/Response globals, which jsdom does not provide.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOTAL_PERIODS } from "@/features/revenue-totals/types";
import type { YoYTrend } from "@/features/revenue-totals/types";

const hasDashboardSession = vi.fn();
const getSigned = vi.fn();

vi.mock("@/lib/serverSession", () => ({
  hasDashboardSession: () => hasDashboardSession(),
}));

vi.mock("@/lib/paymentPortalApi", () => ({
  getSigned: (path: string, params: URLSearchParams) => getSigned(path, params),
}));

const feeRow = {
  fee: "PETITION_FILING_FEE",
  feeName: "Petition",
  qty: 2,
  subtotal: 120,
};

const period = (total: number) => ({
  from: "2026-09-01T04:00:00.000Z",
  to: "2026-09-11T14:00:00.000Z",
  total,
  fees: [feeRow],
});

const trend = (current: number): YoYTrend => ({
  current,
  previous: current - 10,
  difference: 10,
  percentChange: 5,
  available: true,
});

const snapshot = <T>(make: (index: number) => T) =>
  Object.fromEntries(TOTAL_PERIODS.map((name, index) => [name, make(index)]));

const upstreamOk = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

const validBody = () => ({
  totals: snapshot((index) => period(100 + index)),
  yoyTrends: snapshot((index) => trend(100 + index)),
});

const invokeGet = async () => {
  const { GET } = await import("./route");
  const response = await GET();
  return { response, body: await response.json() };
};

describe("GET /api/totals", () => {
  beforeEach(() => {
    hasDashboardSession.mockResolvedValue(true);
    getSigned.mockResolvedValue(upstreamOk(validBody()));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns 401 without reaching the API when there is no dashboard session", async () => {
    hasDashboardSession.mockResolvedValue(false);

    const { response, body } = await invokeGet();

    expect(response.status).toBe(401);
    expect(body).toEqual({ message: "Unauthorized" });
    expect(getSigned).not.toHaveBeenCalled();
  });

  it("requests /revenue-summary and returns the validated totals and trends", async () => {
    const { response, body } = await invokeGet();

    expect(getSigned).toHaveBeenCalledWith(
      "/revenue-summary",
      new URLSearchParams(),
    );
    expect(response.status).toBe(200);
    expect(body.current.day.total).toBe(100);
    expect(body.current.fiscalYear.fees).toEqual([feeRow]);
    expect(body.yoyTrends.day).toMatchObject({
      available: true,
      percentChange: 5,
    });
  });

  it("returns 502 when the upstream responds with an error status", async () => {
    getSigned.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    });

    const { response, body } = await invokeGet();

    expect(response.status).toBe(502);
    expect(body).toEqual({ message: "Unable to load the totals" });
  });

  it("returns 502 when the upstream body has no totals at all", async () => {
    getSigned.mockResolvedValue(
      upstreamOk({ yoyTrends: snapshot(() => trend(1)) }),
    );

    const { response } = await invokeGet();

    expect(response.status).toBe(502);
  });

  it.each([
    ["a non-numeric total", { ...period(1), total: "100" }],
    ["an unparseable date", { ...period(1), from: "not-a-date" }],
    ["fees that are not an array", { ...period(1), fees: null }],
    [
      "a fee row missing its subtotal",
      { ...period(1), fees: [{ ...feeRow, subtotal: "120" }] },
    ],
  ])("returns 502 when a period has %s", async (_label, malformed) => {
    const body = validBody();
    body.totals.month = malformed as never;
    getSigned.mockResolvedValue(upstreamOk(body));

    const { response } = await invokeGet();

    expect(response.status).toBe(502);
  });

  it.each([
    ["are missing", undefined],
    ["are malformed", { current: "100" }],
  ])(
    "falls back to unavailable trends when the trends %s",
    async (_label, malformedTrend) => {
      const body = validBody();
      if (malformedTrend === undefined) {
        delete (body as Partial<ReturnType<typeof validBody>>).yoyTrends;
      } else {
        body.yoyTrends.quarter = malformedTrend as never;
      }
      getSigned.mockResolvedValue(upstreamOk(body));

      const { response, body: payload } = await invokeGet();

      expect(response.status).toBe(200);
      expect(payload.current.day.total).toBe(100);
      for (const name of TOTAL_PERIODS) {
        expect(payload.yoyTrends[name]).toMatchObject({
          available: false,
          previous: null,
          difference: null,
          percentChange: null,
        });
      }
      expect(payload.yoyTrends.day.current).toBe(100);
    },
  );

  it("accepts explicitly null trend figures as valid", async () => {
    const body = validBody();
    body.yoyTrends.day = {
      current: 100,
      previous: null,
      difference: null,
      percentChange: null,
      available: false,
    };
    getSigned.mockResolvedValue(upstreamOk(body));

    const { response, body: payload } = await invokeGet();

    expect(response.status).toBe(200);
    expect(payload.yoyTrends.week).toMatchObject({ available: true });
  });

  it("returns 502 when the API call throws", async () => {
    getSigned.mockRejectedValue(new Error("socket hang up"));

    const { response, body } = await invokeGet();

    expect(response.status).toBe(502);
    expect(body).toEqual({ message: "Unable to reach the totals" });
  });
});
