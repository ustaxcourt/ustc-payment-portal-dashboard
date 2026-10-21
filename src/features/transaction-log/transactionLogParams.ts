import type { TransactionSearchFilters } from "./types";

/** Metadata is a pair: a lookup runs only when both halves are set. */
export const pairedMetadata = (filters?: TransactionSearchFilters) =>
  filters?.metadataKey && filters?.metadataValue
    ? { key: filters.metadataKey, value: filters.metadataValue }
    : null;

/** The one place filters become query params, shared by the table and the
 *  export so the file always matches the rows on screen. */
export const appendFilterParams = (
  params: URLSearchParams,
  filters?: TransactionSearchFilters,
) => {
  if (filters?.feeType) params.set("fee", filters.feeType);
  if (filters?.payType) params.set("paymentMethod", filters.payType);
  if (filters?.paymentStatus) params.set("status", filters.paymentStatus);
  if (filters?.transactionStatus) {
    params.set("transactionStatus", filters.transactionStatus);
  }
  const metadata = pairedMetadata(filters);
  if (metadata) {
    params.set("metadataKey", metadata.key);
    params.set("metadataValue", metadata.value);
  }
};
