import type { AppliedDateRange } from "./dateRange";
import type { TransactionSearchFilters } from "./types";

export const NO_FILTERS: TransactionSearchFilters = {
  feeType: null,
  payType: null,
  paymentStatus: null,
  transactionStatus: null,
  metadataKey: null,
  metadataValue: null,
};

export const customRange = (from: string, to: string): AppliedDateRange => ({
  preset: "custom",
  from,
  to,
  label: `${from} - ${to}`,
});
