# PAY-393 — Totals for Day, Week, Month, Quarter, and Fiscal Year

**Spans two repos.** `ustc-payment-portal` aggregates; this repo renders.
Agree the [contract](#contract) first — it's the handshake and the expensive
thing to change later.

## Story & AC

Finance staff need revenue totals for day / week / month / quarter / fiscal year,
each to date, with its start and end dates shown. Failed and pending excluded —
i.e. **only `paymentStatus = 'success'` counts**.

---

## Decisions

1. **The database aggregates.** Summing rows client-side can't work: `pageSize`
   is capped at 200 upstream, so any window busier than that under-reports
   *silently*. ADR 0001 forbids the shape anyway.
2. **Extend `/transaction-log`; don't add an endpoint.** The backend runs one
   Lambda per handler, so a new endpoint means new Terraform, tfvars, CI vars,
   API Gateway wiring, log group and alarms — across three AWS accounts. Extending
   costs zero infrastructure in either repo.
3. **Opt-in via `?includeTotals=true`.** The hot path (every tab and sort click)
   doesn't pay for aggregates it didn't ask for. Both the param and the field
   default off, so the backend half is non-breaking and **ships independently**.
4. **The server owns "now"** and returns the boundaries it used, as it already
   does for `from`/`to`. Browser-computed windows would differ by clock skew and
   timezone. This also satisfies the "display beginning/ending dates" AC directly.
5. **Separate React Query key.** The table depends on tab/sort/order/timeframe;
   the totals depend on nothing the user controls. Different dependencies,
   different cache lifetimes.

---

## Verified upstream facts

Checked against `../ustc-payment-portal` on 2026-08-16 — not assumed:

| Fact | Source |
| --- | --- |
| No totals/aggregate endpoint exists | `src/handlers/` — ten handlers, none aggregate dollars |
| `pageSize` hard cap is 200 (401 → 400 error) | `TRANSACTION_LOG_MAX_PAGE_SIZE` |
| Timeframe defaults to the current Court day | `src/useCases/getTransactionLog.ts:20-22` |
| Court day bounds are DST-correct, half-open `[start, end)` | `src/utils/courtDayBounds.ts` |
| `counts` deliberately ignores the `status` filter | `TransactionCountsSchema` |
| Log timeframe filters on `lastUpdatedAt` | `queryLog` / `countsInRange` |
| `sort`/`order` already shipped | schema + response echo |

---

## Contract

```
GET /transaction-log?includeTotals=true
```

```jsonc
"totals": {                              // present only when requested
  "day":        { "from": "…", "to": "…", "total": 12450.00 },
  "week":       { … }, "month": { … }, "quarter": { … }, "fiscalYear": { … }
}
```

Semantics to state in the schema description, because they surprise people:

- Successful payments only
- **Ignores `from`/`to` and `status` entirely** — `counts` ignores only `status`;
  this is the first field to ignore the timeframe too
- Windows are *to date*: each ends at now
- Resolved in `America/New_York`, half-open `[from, to)`

| Window | Start |
| --- | --- |
| Day | Midnight ET today |
| Week | Most recent Sunday |
| Month | 1st of month |
| Quarter | **Fiscal** quarter start — Oct 1 / Jan 1 / Apr 1 / Jul 1 |
| Fiscal year | Oct 1 (prior calendar year if month < October) |

> Fiscal quarters, not calendar. Q1 is Oct–Dec; `Math.floor(month / 3)` is wrong.

---

## Part A — Backend (`ustc-payment-portal`)

**A1. Query schema** (`src/schemas/TransactionLog.schema.ts`)

```ts
includeTotals: z.enum(["true", "false"]).default("false")
  .transform((v) => v === "true"),
```

> **Not `z.coerce.boolean()`** — it's `Boolean(value)`, so the non-empty string
> `"false"` becomes `true` and `?includeTotals=false` switches totals *on*.
> Assert `"false"` → `false` in a test.

**A2. Response schema** — `TransactionTotalWindowSchema` (`from`, `to`, `total`),
`TransactionTotalsSchema` (the five windows), then
`totals: TransactionTotalsSchema.optional()` on the response.

**A3. Boundaries** — generalise `courtDayBounds` into `courtWindowBounds`; it
already handles DST transitions and returns instants, not a date predicate
(*"`AT TIME ZONE` in a `WHERE` skips the indexes"*). Keep `courtDayBounds`
exported; the timeframe default still uses it.

**A4. Aggregation** — `TransactionModel.totalsToDate(windows)` alongside
`countsInRange`, same style. One round trip: `SUM` with `FILTER (WHERE …)` per
window. Filter on `lastUpdatedAt` (see [Q2](#open-questions)) and
`paymentStatus = 'success'`.

**A5. Use case** — keep it parallel, spread conditionally so the key is absent
rather than `undefined`:

```ts
const [page, counts, totals] = await Promise.all([
  TransactionModel.queryLog({ … }),
  TransactionModel.countsInRange(from, to),
  query.includeTotals ? TransactionModel.totalsToDate(courtWindowBounds()) : undefined,
]);
// …(totals ? { totals } : {}),
```

**A6. OpenAPI** — register both schemas in `src/openapi/registry.ts`, regenerate
`docs/openapi.yaml` / `.json`.

**A7. Changeset** — `"@ustaxcourt/payment-portal": minor`. House style: what the
caller gains, and that existing callers are unaffected.

**A8. Tests** — schema (`"true"`/`"false"`/absent; response parses with and
without `totals`); `courtWindowBounds` (Sunday start, fiscal quarter mapping,
FY rollover Sep 30 → Oct 1, a DST day); DB (failed/pending excluded, `[start`
and `end)` boundary rows, empty window → `0` not `null`); integration (field
present when requested, absent when not).

---

## Part B — Dashboard (this repo)

**B1. Types** — `src/features/revenue-totals/types.ts`, hand-mirrored with a
`/** Mirrors TransactionTotalsSchema in the payment portal. */` comment, as
[transaction-log/types.ts](../src/features/transaction-log/types.ts) does.

**B2. Route** — `src/app/api/totals/route.ts`, same gate order as
[api/transactions/route.ts](../src/app/api/transactions/route.ts):

```ts
if (!(await hasDashboardSession())) return 401;
const upstream = await getSigned("/transaction-log",
  new URLSearchParams({ includeTotals: "true", pageSize: "1" }));
if (!upstream.ok || !body.totals) return 502;
return NextResponse.json(body.totals);
```

- No `FORWARDED` allowlist — the route takes no client params; the flag is hardcoded
- `pageSize: 1` — rows discarded; a `LIMIT 1` query and `counts` are still run
  upstream and thrown away, the small price of independent cache lifetimes
- **Optionality stops here**, so components never write `totals?.day`
- **No Terraform change** — still `GET /transaction-log`, already in `api_invoke_arns`

**B3. Hook** — `useTotals()`, `queryKey: ["totals"]`. No variables in the key, so
it fetches once per mount and never again (`refetchOnWindowFocus` is off globally
in [Providers.tsx](../src/providers/Providers.tsx)). See [Q3](#open-questions).

**B4. `TotalCard.tsx`** — props `label` + `window`. Uses `formatCurrency` and
`formatCourtDate` from [lib/format.ts](../src/lib/format.ts). No new date or
formatting helpers; the dashboard computes no boundaries.

**B5. `RevenueTotals.tsx`** (`"use client"`) — five cards in a responsive grid,
skeleton on `isPending`, error panel + `refetch()` on `isError`, mirroring
[TransactionLog.tsx](../src/features/transaction-log/TransactionLog.tsx). Empty
day renders `$0.00`, never blank.

**B6. `page.tsx`** — between the header and `<TransactionLog />`.

**B7. Tests** — after PAY-397's Vitest harness lands, or borrow its config. Card
renders currency + both dates; loading and error branches; route 401 and 502.

```
src/app/api/totals/route.ts
src/features/revenue-totals/{types.ts,useTotals.ts,TotalCard.tsx,RevenueTotals.tsx}
```

---

## Sequencing

```
agree contract ─┬─► BACKEND A1–A8  (non-breaking, ships independently)
                │            │
                └─► B1,B4,B5 │  (pure — build against a stub)
                     │       ▼
                     └──► deployed to dev ──► B2,B3 ──► B6,B7
```

The backend is on the critical path but **not blocking**. B6 touches
[page.tsx](../src/app/page.tsx), which PAY-386 and PAY-397 also modify — land
those first.

---

## Open questions

1. **`transactionAmount` or `fee`?** The entry carries both. Recommend
   `transactionAmount` (numeric, what `formatCurrency` takes) — **needs PO
   confirmation; it changes every figure on screen.**
2. **`lastUpdatedAt` or `createdAt`?** Recommend matching the log's timeframe so
   a row appears in the table and the totals for the same window. Backend dev's call.
3. **Staleness.** A dashboard opened at 9am shows 9am's day-to-date at 5pm and
   nothing refreshes it. If finance needs it live: `refetchInterval`, or a visible
   "as of HH:MM". Product question.
4. **Refunds/reversals** — do they subtract? Not in the AC.
5. **FY label** — "FY2026", the date range, or both?

## Out of scope

Year-over-year, trend projections, CSV export of totals.
