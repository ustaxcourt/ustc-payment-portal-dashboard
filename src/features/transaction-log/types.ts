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

/** The one frontend fee registry, mirroring `staticFees` in the payment
 *  portal. When a fee is added to the backend, one entry here gives it a
 *  search filter option; the breakdown table renders whatever fees the API
 *  returns — zero rows included — with no change at all. */
export const FEE_TYPE_LABEL = {
  PETITION_FILING_FEE: "Petition Filing Fee",
  NONATTORNEY_EXAM_REGISTRATION_FEE: "Non-Attorney Exam Registration Fee",
} as const satisfies Record<string, string>;

export type FeeType = keyof typeof FEE_TYPE_LABEL;

export const FEE_TYPES = Object.keys(FEE_TYPE_LABEL) as readonly FeeType[];

/** Mirrors `TRANSACTION_LOG_METADATA_KEYS` in the payment portal. */
export const METADATA_KEYS = [
  "docketNumber",
  "email",
  "fullName",
  "accessCode",
] as const;

export type MetadataKey = (typeof METADATA_KEYS)[number];

export const METADATA_KEY_LABEL: Record<MetadataKey, string> = {
  docketNumber: "Docket Number",
  email: "Email",
  fullName: "Full Name",
  accessCode: "Access Code",
};

/** Which metadata keys each fee collects; the lookup picker is scoped to the selected fee. */
export const FEE_METADATA_KEYS: Record<FeeType, readonly MetadataKey[]> = {
  PETITION_FILING_FEE: ["docketNumber"],
  NONATTORNEY_EXAM_REGISTRATION_FEE: ["email", "fullName", "accessCode"],
};

/** Mirrors the payment portal's `paymentMethod` label enum. */
export const PAY_TYPES = ["Credit/Debit Card", "ACH", "PayPal"] as const;

export type PayType = (typeof PAY_TYPES)[number];

export type TransactionSearchFilters = {
  feeType: FeeType | null;
  payType: PayType | null;
  paymentStatus: PaymentStatus | null;
  transactionStatus: TransactionStatus | null;
  /** Paired with `metadataValue`; a lookup runs only when both are set. */
  metadataKey: MetadataKey | null;
  metadataValue: string | null;
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
  /** Free-form key/value bag; keys collected depend on the fee. */
  metadata?: Record<string, string> | null;
};

export type TransactionCounts = {
  all: number;
  success: number;
  failed: number;
  pending: number;
};

/** Mirrors `TransactionFeeBreakdownRow` in the payment portal. */
export type FeeBreakdownRow = {
  fee: string;
  feeName: string;
  qty: number;
  subtotal: number;
};

export type TransactionLogResponse = {
  data: TransactionLogEntry[];
  /** Absent on export requests for pages after the first. */
  counts?: TransactionCounts;
  from: string;
  to: string;
  page: number;
  pageSize: number;
  sort: TransactionSortField;
  order: SortOrder;
  /** Absent on export requests for pages after the first. */
  total?: number;
  /** Present when requested with `includeFeeBreakdown=true`. */
  feeBreakdown?: FeeBreakdownRow[];
};
