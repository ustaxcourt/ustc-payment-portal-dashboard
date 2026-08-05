export const PAYMENT_STATUSES = ["success", "failed", "pending"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const TRANSACTION_TABS = ["all", ...PAYMENT_STATUSES] as const;

export type TransactionTab = (typeof TRANSACTION_TABS)[number];

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
  total: number;
};
