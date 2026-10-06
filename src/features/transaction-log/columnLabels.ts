import type { MetadataKey, TransactionSortField } from "./types";

type TrackingIdField = "paygovTrackingId" | "agencyTrackingId";

type MetadataColumnId = `metadata.${MetadataKey}`;

export type TransactionColumnId =
  | TransactionSortField
  | TrackingIdField
  | MetadataColumnId;

export const metadataColumnId = (key: MetadataKey): MetadataColumnId =>
  `metadata.${key}`;

export const COLUMN_LABEL: Record<TransactionColumnId, string> = {
  createdAt: "Created",
  lastUpdatedAt: "Last updated",
  feeName: "Fee",
  transactionAmount: "Amount",
  paymentMethod: "Payment method",
  paymentStatus: "Payment status",
  returnDetail: "Failure reason",
  transactionStatus: "Transaction status",
  clientName: "Client",
  transactionReferenceId: "Reference ID",
  paygovTrackingId: "Pay.gov tracking ID",
  agencyTrackingId: "Agency tracking ID",
  "metadata.docketNumber": "Docket number",
  "metadata.email": "Email",
  "metadata.fullName": "Full name",
  "metadata.accessCode": "Access code",
};
