import {
  columnSizingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

export const transactionTableFeatures = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  columnSizingFeature,
});

export type TransactionTableFeatures = typeof transactionTableFeatures;
