"use client";

import { useReducer } from "react";
import type { TransactionColumnId } from "./columnLabels";
import {
  COLUMN_IDS,
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
  chosenBeforeHiding: Partial<ColumnVisibility>;
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
  chosenBeforeHiding: {},
});

const isSameIds = (
  a: readonly TransactionColumnId[],
  b: readonly TransactionColumnId[],
) => a.length === b.length && a.every((id, index) => id === b[index]);

const keepStillHidden = (
  chosenBeforeHiding: Partial<ColumnVisibility>,
  searchedIds: readonly TransactionColumnId[],
  chosen: ColumnVisibility,
): Partial<ColumnVisibility> => {
  const kept: Partial<ColumnVisibility> = {};
  for (const id of searchedIds) {
    if (id in chosenBeforeHiding && !chosen[id]) {
      kept[id] = chosenBeforeHiding[id];
    }
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
    const { [id]: visibleBeforeHiding, ...stillHidden } =
      state.chosenBeforeHiding;
    return {
      ...state,
      chosen: {
        ...state.chosen,
        [id]: visibleBeforeHiding ?? state.chosen[id],
      },
      chosenBeforeHiding: stillHidden,
    };
  }
  return {
    ...state,
    chosen: { ...state.chosen, [id]: false },
    chosenBeforeHiding: {
      ...state.chosenBeforeHiding,
      [id]: state.chosenBeforeHiding[id] ?? state.chosen[id],
    },
  };
};

const columnsReducer = (
  state: ColumnState,
  action: ColumnAction,
): ColumnState => {
  switch (action.type) {
    case "filtersChanged": {
      const chosen =
        action.feeType === state.feeType
          ? state.chosen
          : withFeeDefaults(state.chosen, action.feeType);
      return {
        feeType: action.feeType,
        searchedIds: action.searchedIds,
        chosen,
        chosenBeforeHiding: keepStillHidden(
          state.chosenBeforeHiding,
          action.searchedIds,
          chosen,
        ),
      };
    }
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
    (id) => !(id in state.chosenBeforeHiding),
  );
  const chosenIds = COLUMN_IDS.filter((id) => state.chosen[id]);

  return {
    visibility: withSearchedColumns(state.chosen, shownSearchedIds),
    lockedId: chosenIds.length === 1 ? chosenIds[0] : null,
    isDefault:
      Object.keys(state.chosenBeforeHiding).length === 0 &&
      isSameVisibility(state.chosen, defaultColumnVisibility(state.feeType)),
    toggle: (id: TransactionColumnId, visible: boolean) =>
      dispatch({ type: "toggled", id, visible }),
    reset: () => dispatch({ type: "reset" }),
  };
};
