import type { AppliedDateRange } from "./dateRange";
import { toDatePickerValue } from "./dateRange";
import { TAB_LABEL } from "./statusStyles";
import type { TransactionTab } from "./types";

/** Named for the data's date range (PO decision), not the export moment:
 *  `2026-08-01 to 2026-08-14 - USTC Fee Payment Summary (Successful).xlsx` */
export const exportFilename = (
  range: AppliedDateRange,
  tab: TransactionTab,
): string => {
  const from = toDatePickerValue(range.from);
  const to = toDatePickerValue(range.to);
  const span = from === to ? from : `${from} to ${to}`;
  const status = tab === "all" ? "" : ` (${TAB_LABEL[tab]})`;
  return `${span} - USTC Fee Payment Summary${status}.xlsx`;
};
