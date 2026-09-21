import type { Page } from "@playwright/test";
import type { TotalsResponse } from "../../src/features/revenue-totals/types";
import type {
  PaymentStatus,
  SortOrder,
  TransactionLogEntry,
  TransactionLogResponse,
  TransactionSortField,
} from "../../src/features/transaction-log/types";

const NOW = "2026-08-18T16:30:00.000Z";

const totals = (): TotalsResponse => ({
  current: {
    day: {
      from: "2026-08-18T04:00:00.000Z",
      to: NOW,
      total: 4500,
      fees: [
        {
          fee: "PETITION_FILING_FEE",
          feeName: "Petition Filing Fee",
          qty: 1,
          subtotal: 300,
        },
      ],
    },
    week: {
      from: "2026-08-11T04:00:00.000Z",
      to: NOW,
      total: 22000,
      fees: [
        {
          fee: "PETITION_FILING_FEE",
          feeName: "Petition Filing Fee",
          qty: 5,
          subtotal: 1500,
        },
      ],
    },
    month: {
      from: "2026-08-01T04:00:00.000Z",
      to: NOW,
      total: 98125,
      fees: [
        {
          fee: "PETITION_FILING_FEE",
          feeName: "Petition Filing Fee",
          qty: 7,
          subtotal: 7000,
        },
      ],
    },
    quarter: {
      from: "2026-07-01T04:00:00.000Z",
      to: NOW,
      total: 158500,
      fees: [
        {
          fee: "PETITION_FILING_FEE",
          feeName: "Petition Filing Fee",
          qty: 12,
          subtotal: 12000,
        },
      ],
    },
    fiscalYear: {
      from: "2025-10-01T04:00:00.000Z",
      to: NOW,
      total: 458500,
      fees: [
        {
          fee: "PETITION_FILING_FEE",
          feeName: "Petition Filing Fee",
          qty: 35,
          subtotal: 35000,
        },
      ],
    },
  },
  yoyTrends: {
    day: {
      current: 4500,
      previous: 4100,
      difference: 400,
      percentChange: 9.76,
    },
    week: {
      current: 22000,
      previous: 20500,
      difference: 1500,
      percentChange: 7.32,
    },
    month: {
      current: 98125,
      previous: 93000,
      difference: 5125,
      percentChange: 5.51,
    },
    quarter: {
      current: 158500,
      previous: 150000,
      difference: 8500,
      percentChange: 5.67,
    },
    fiscalYear: {
      current: 458500,
      previous: 430000,
      difference: 28500,
      percentChange: 6.63,
    },
  },
});

const transaction = (
  overrides: Partial<TransactionLogEntry>,
): TransactionLogEntry => ({
  agencyTrackingId: "agency-001",
  paygovTrackingId: "paygov-001",
  feeName: "Petition Filing Fee",
  fee: "PETITION_FILING_FEE",
  transactionAmount: 60,
  clientName: "Jordan Example",
  transactionReferenceId: "TXN-001",
  paymentStatus: "success",
  transactionStatus: "processed",
  paymentMethod: "ACH",
  returnCode: null,
  returnDetail: null,
  createdAt: "2026-08-18T13:00:00.000Z",
  lastUpdatedAt: "2026-08-18T13:10:00.000Z",
  ...overrides,
});

const counts = {
  all: 3,
  success: 1,
  failed: 1,
  pending: 1,
};

const allRows = (): TransactionLogEntry[] => [
  transaction({
    agencyTrackingId: "agency-001",
    paymentStatus: "success",
    transactionStatus: "processed",
  }),
  transaction({
    agencyTrackingId: "agency-002",
    paygovTrackingId: "paygov-002",
    clientName: "Alex Example",
    transactionReferenceId: "TXN-002",
    paymentStatus: "failed",
    transactionStatus: "failed",
    paymentMethod: "Credit/Debit Card",
    returnCode: 12,
    returnDetail: "Account closed",
    createdAt: "2026-08-17T15:00:00.000Z",
    lastUpdatedAt: "2026-08-17T15:05:00.000Z",
  }),
  transaction({
    agencyTrackingId: "agency-003",
    paygovTrackingId: "paygov-003",
    clientName: "Taylor Example",
    transactionReferenceId: "TXN-003",
    paymentStatus: "pending",
    transactionStatus: "pending",
    paymentMethod: "PayPal",
    createdAt: "2026-08-16T17:30:00.000Z",
    lastUpdatedAt: "2026-08-16T17:32:00.000Z",
  }),
];

const response = (
  overrides: Partial<TransactionLogResponse> = {},
): TransactionLogResponse => ({
  data: allRows(),
  counts,
  from: "2026-08-11T04:00:00.000Z",
  to: NOW,
  page: 1,
  pageSize: 200,
  sort: "createdAt",
  order: "desc",
  total: 3,
  ...overrides,
});

const asSortField = (value: string | null): TransactionSortField => {
  switch (value) {
    case "lastUpdatedAt":
    case "feeName":
    case "transactionAmount":
    case "paymentMethod":
    case "paymentStatus":
    case "returnDetail":
    case "transactionStatus":
    case "clientName":
    case "transactionReferenceId":
      return value;
    default:
      return "createdAt";
  }
};

const asOrder = (value: string | null): SortOrder =>
  value === "asc" ? "asc" : "desc";

const asStatus = (value: string | null): PaymentStatus | null => {
  switch (value) {
    case "success":
    case "failed":
    case "pending":
      return value;
    default:
      return null;
  }
};

export async function stubDashboardResponses(page: Page): Promise<void> {
  await page.route(/\/api\/totals$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(totals()),
    });
  });

  await page.route(/\/api\/transactions(?:\?.*)?$/, async (route) => {
    const requestUrl = new URL(route.request().url());
    const status = asStatus(requestUrl.searchParams.get("status"));
    const rows = status
      ? allRows().filter((row) => row.paymentStatus === status)
      : allRows();

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        response({
          data: rows,
          feeBreakdown:
            requestUrl.searchParams.get("includeFeeBreakdown") === "true"
              ? [
                  {
                    fee: "PETITION_FILING_FEE",
                    feeName: "Petition Filing Fee",
                    qty: 1,
                    subtotal: 60,
                  },
                ]
              : undefined,
          sort: asSortField(requestUrl.searchParams.get("sort")),
          order: asOrder(requestUrl.searchParams.get("order")),
          total: rows.length,
        }),
      ),
    });
  });
}
