"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { isSortableOnTab } from "./columns";
import { DATE_RANGE_PRESETS, resolveAppliedDateRange } from "./dateRange";
import {
  DEFAULT_ORDER,
  DEFAULT_SORT,
  SORT_ORDERS,
  TRANSACTION_SORT_FIELDS,
  TRANSACTION_TABS,
  type TransactionTab,
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
      status: parseAsStringLiteral(TRANSACTION_TABS).withDefault("all"),
      to: parseAsString,
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

  const selectTab = (next: TransactionTab) => {
    setParams(
      isSortableOnTab(params.sort, next)
        ? { status: next }
        : { status: next, sort: DEFAULT_SORT, order: DEFAULT_ORDER },
    );
  };

  return { params, setParams, tab, appliedRange, activeSorting, selectTab };
};
