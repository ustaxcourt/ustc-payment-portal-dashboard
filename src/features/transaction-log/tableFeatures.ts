import {
  columnSizingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

// Sizing backs the `size` column option and `getSize()` used for the colgroup
// widths; dropping it silently breaks layout, not just types.
export const transactionTableFeatures = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  columnSizingFeature,
});

export type TransactionTableFeatures = typeof transactionTableFeatures;
