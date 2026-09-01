"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { isSortableOnTab } from "./columns";
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
  VIEW_TABS,
  type ViewTab,
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
      status: parseAsStringLiteral(VIEW_TABS).withDefault("all"),
      to: parseAsString,
      feeType: parseAsStringLiteral(FEE_TYPES),
      payType: parseAsStringLiteral(PAY_TYPES),
      paymentStatus: parseAsStringLiteral(PAYMENT_STATUSES),
      transactionStatus: parseAsStringLiteral(TRANSACTION_STATUSES),
      metadataKey: parseAsStringLiteral(METADATA_KEYS),
      metadataValue: parseAsString,
    },
    {
      clearOnDefault: true,
    },
  );

  const tab = params.status;
  const appliedRange = resolveAppliedDateRange(
    params.range,
    params.from,
    params.to,
  );

  const sorting = { sort: params.sort, order: params.order };
  const activeSorting = isSortableOnTab(sorting.sort, tab)
    ? sorting
    : { sort: DEFAULT_SORT, order: DEFAULT_ORDER };

  const selectTab = (next: ViewTab) => {
    setParams(
      isSortableOnTab(params.sort, next)
        ? { status: next }
        : { status: next, sort: DEFAULT_SORT, order: DEFAULT_ORDER },
    );
  };

  const searchFilters: TransactionSearchFilters | undefined =
    tab === "search"
      ? {
          feeType: params.feeType,
          payType: params.payType,
          paymentStatus: params.paymentStatus,
          transactionStatus: params.transactionStatus,
          metadataKey: params.metadataKey,
          metadataValue: params.metadataValue,
        }
      : undefined;

  const hasSearchCriteria = Boolean(
    searchFilters?.feeType ||
      searchFilters?.payType ||
      searchFilters?.paymentStatus ||
      searchFilters?.transactionStatus ||
      searchFilters?.metadataValue,
  );

  const clearSearch = () =>
    setParams({
      feeType: null,
      payType: null,
      paymentStatus: null,
      transactionStatus: null,
      metadataKey: null,
      metadataValue: null,
    });

  // The search tab fetches nothing until a filter is chosen.
  const queryEnabled = tab !== "search" || hasSearchCriteria;

  return {
    params,
    setParams,
    tab,
    appliedRange,
    activeSorting,
    selectTab,
    searchFilters,
    hasSearchCriteria,
    clearSearch,
    queryEnabled,
  };
};
