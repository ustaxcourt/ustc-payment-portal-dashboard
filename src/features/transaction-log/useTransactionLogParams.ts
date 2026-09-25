"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { DATE_RANGE_PRESETS, resolveAppliedDateRange } from "./dateRange";
import {
  DEFAULT_ORDER,
  DEFAULT_SORT,
  FEE_TYPES,
  METADATA_KEYS,
  PAY_TYPES,
  PAYMENT_STATUSES,
  SORT_ORDERS,
  TRANSACTION_SORT_FIELDS,
  TRANSACTION_STATUSES,
  type TransactionSearchFilters,
} from "./types";

export const useTransactionLogParams = () => {
  const [params, setParams] = useQueryStates(
    {
      from: parseAsString,
      order: parseAsStringLiteral(SORT_ORDERS).withDefault(DEFAULT_ORDER),
      range: parseAsStringLiteral(DATE_RANGE_PRESETS).withDefault("today"),
      sort: parseAsStringLiteral(TRANSACTION_SORT_FIELDS).withDefault(
        DEFAULT_SORT,
      ),
      status: parseAsStringLiteral(PAYMENT_STATUSES),
      to: parseAsString,
      feeType: parseAsStringLiteral(FEE_TYPES),
      payType: parseAsStringLiteral(PAY_TYPES),
      // Legacy key: the old Search tab wrote the Payment Status dropdown here,
      // separately from `status` (the old tab param). Kept as a read-only
      // fallback so links minted before the tabs-to-sidebar refactor still
      // filter correctly; `status` is the sole key written going forward.
      paymentStatus: parseAsStringLiteral(PAYMENT_STATUSES),
      transactionStatus: parseAsStringLiteral(TRANSACTION_STATUSES),
      metadataKey: parseAsStringLiteral(METADATA_KEYS),
      metadataValue: parseAsString,
    },
    {
      clearOnDefault: true,
    },
  );

  const appliedRange = resolveAppliedDateRange(
    params.range,
    params.from,
    params.to,
  );

  const activeSorting = { sort: params.sort, order: params.order };

  const paymentStatus = params.status ?? params.paymentStatus;

  const searchFilters: TransactionSearchFilters = {
    feeType: params.feeType,
    payType: params.payType,
    paymentStatus,
    transactionStatus: params.transactionStatus,
    metadataKey: params.metadataKey,
    metadataValue: params.metadataValue,
  };

  const hasSearchCriteria = Boolean(
    searchFilters.feeType ||
      searchFilters.payType ||
      searchFilters.paymentStatus ||
      searchFilters.transactionStatus ||
      (searchFilters.metadataKey && searchFilters.metadataValue)
  );

  const clearSearch = () =>
    setParams({
      status: null,
      feeType: null,
      payType: null,
      paymentStatus: null,
      transactionStatus: null,
      metadataKey: null,
      metadataValue: null,
    });

  return {
    params,
    setParams,
    appliedRange,
    activeSorting,
    searchFilters,
    hasSearchCriteria,
    clearSearch,
  };
};
