"use client";

import { useReducer } from "react";
import type { TransactionColumnId } from "./columnLabels";
import {
  type ColumnVisibility,
  defaultColumnVisibility,
  isSameVisibility,
  searchedColumnIds,
  withFeeDefaults,
  withSearchedColumns,
} from "./columns";
import type { FeeType, TransactionSearchFilters } from "./types";

type ColumnState = {
  feeType: FeeType | null;
  searchedIds: readonly TransactionColumnId[];
  chosen: ColumnVisibility;
  hiddenSearched: Partial<ColumnVisibility>;
};

type ColumnAction =
  | {
      type: "filtersChanged";
      feeType: FeeType | null;
      searchedIds: readonly TransactionColumnId[];
    }
  | { type: "toggled"; id: TransactionColumnId; visible: boolean }
  | { type: "reset" };

const initialState = (
  feeType: FeeType | null,
  searchedIds: readonly TransactionColumnId[],
): ColumnState => ({
  feeType,
  searchedIds,
  chosen: defaultColumnVisibility(feeType),
  hiddenSearched: {},
});

const isSameIds = (
  a: readonly TransactionColumnId[],
  b: readonly TransactionColumnId[],
) => a.length === b.length && a.every((id, index) => id === b[index]);

const keepStillSearched = (
  hiddenSearched: Partial<ColumnVisibility>,
  searchedIds: readonly TransactionColumnId[],
): Partial<ColumnVisibility> => {
  const kept: Partial<ColumnVisibility> = {};
  for (const id of searchedIds) {
    if (id in hiddenSearched) kept[id] = hiddenSearched[id];
  }
  return kept;
};

const toggle = (
  state: ColumnState,
  id: TransactionColumnId,
  visible: boolean,
): ColumnState => {
  if (!state.searchedIds.includes(id)) {
    return { ...state, chosen: { ...state.chosen, [id]: visible } };
  }
  if (visible) {
    const { [id]: visibleBeforeHiding, ...stillHidden } = state.hiddenSearched;
    return {
      ...state,
      chosen: {
        ...state.chosen,
        [id]: visibleBeforeHiding ?? state.chosen[id],
      },
      hiddenSearched: stillHidden,
    };
  }
  return {
    ...state,
    chosen: { ...state.chosen, [id]: false },
    hiddenSearched: {
      ...state.hiddenSearched,
      [id]: state.hiddenSearched[id] ?? state.chosen[id],
    },
  };
};

const columnsReducer = (
  state: ColumnState,
  action: ColumnAction,
): ColumnState => {
  switch (action.type) {
    case "filtersChanged":
      return {
        feeType: action.feeType,
        searchedIds: action.searchedIds,
        chosen:
          action.feeType === state.feeType
            ? state.chosen
            : withFeeDefaults(state.chosen, action.feeType),
        hiddenSearched: keepStillSearched(
          state.hiddenSearched,
          action.searchedIds,
        ),
      };
    case "toggled":
      return toggle(state, action.id, action.visible);
    case "reset":
      return initialState(state.feeType, state.searchedIds);
  }
};

export const useColumnVisibility = (filters: TransactionSearchFilters) => {
  const searchedIds = searchedColumnIds(filters);
  const [state, dispatch] = useReducer(columnsReducer, undefined, () =>
    initialState(filters.feeType, searchedIds),
  );

  if (
    state.feeType !== filters.feeType ||
    !isSameIds(state.searchedIds, searchedIds)
  ) {
    dispatch({ type: "filtersChanged", feeType: filters.feeType, searchedIds });
  }

  const shownSearchedIds = state.searchedIds.filter(
    (id) => !(id in state.hiddenSearched),
  );

  return {
    chosen: state.chosen,
    shownSearchedIds,
    tableVisibility: withSearchedColumns(state.chosen, shownSearchedIds),
    isDefault:
      Object.keys(state.hiddenSearched).length === 0 &&
      isSameVisibility(state.chosen, defaultColumnVisibility(state.feeType)),
    toggle: (id: TransactionColumnId, visible: boolean) =>
      dispatch({ type: "toggled", id, visible }),
    reset: () => dispatch({ type: "reset" }),
  };
};
