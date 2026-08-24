export const PAYMENT_STATUSES = ["success", "failed", "pending"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Mirrors `TransactionStatusSchema` in the payment portal. Distinct from `PaymentStatus`. */
export const TRANSACTION_STATUSES = [
  "received",
  "initiated",
  "processing",
  "processed",
  "failed",
  "pending",
] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_TABS = ["all", ...PAYMENT_STATUSES] as const;

export type TransactionTab = (typeof TRANSACTION_TABS)[number];

export const VIEW_TABS = [...TRANSACTION_TABS, "search"] as const;

export type ViewTab = (typeof VIEW_TABS)[number];

/** Mirrors `FeeKey` in the payment portal. */
export const FEE_TYPES = [
  "PETITION_FILING_FEE",
  "NONATTORNEY_EXAM_REGISTRATION_FEE",
] as const;

export type FeeType = (typeof FEE_TYPES)[number];

export const FEE_TYPE_LABEL: Record<FeeType, string> = {
  PETITION_FILING_FEE: "Filing Fee",
  NONATTORNEY_EXAM_REGISTRATION_FEE: "Non-Attorney Exam Registration Fee",
};

/** Mirrors the payment portal's `paymentMethod` label enum. */
export const PAY_TYPES = ["Credit/Debit Card", "ACH", "PayPal"] as const;

export type PayType = (typeof PAY_TYPES)[number];

export type TransactionSearchFilters = {
  feeType: FeeType | null;
  payType: PayType | null;
  paymentStatus: PaymentStatus | null;
  transactionStatus: TransactionStatus | null;
  clientName: string | null;
};

/** Mirrors `TRANSACTION_LOG_SORT_FIELDS` in the payment portal. */
export const TRANSACTION_SORT_FIELDS = [
  "createdAt",
  "lastUpdatedAt",
  "feeName",
  "transactionAmount",
  "paymentMethod",
  "paymentStatus",
  "returnDetail",
  "transactionStatus",
  "clientName",
  "transactionReferenceId",
] as const;

export type TransactionSortField = (typeof TRANSACTION_SORT_FIELDS)[number];

export const isTransactionSortField = (
  value: string,
): value is TransactionSortField =>
  (TRANSACTION_SORT_FIELDS as readonly string[]).includes(value);

export const SORT_ORDERS = ["asc", "desc"] as const;

export type SortOrder = (typeof SORT_ORDERS)[number];

export const DEFAULT_SORT: TransactionSortField = "createdAt";
export const DEFAULT_ORDER: SortOrder = "desc";

export type TransactionSorting = {
  sort: TransactionSortField;
  order: SortOrder;
};

export type TransactionLogEntry = {
  agencyTrackingId: string;
  paygovTrackingId?: string | null;
  feeName: string;
  fee: string;
  transactionAmount: number;
  clientName: string;
  transactionReferenceId: string;
  paymentStatus: PaymentStatus;
  transactionStatus?: string | null;
  paymentMethod?: string | null;
  returnCode?: number | null;
  returnDetail?: string | null;
  createdAt: string;
  lastUpdatedAt: string;
};

export type TransactionCounts = {
  all: number;
  success: number;
  failed: number;
  pending: number;
};

export type TransactionLogResponse = {
  data: TransactionLogEntry[];
  counts: TransactionCounts;
  from: string;
  to: string;
  page: number;
  pageSize: number;
  sort: TransactionSortField;
  order: SortOrder;
  total: number;
};
