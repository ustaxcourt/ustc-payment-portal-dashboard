import type { AppliedDateRange } from "./dateRange";
import { toDatePickerValue } from "./dateRange";
import { activeExportFilters } from "./exportCriteria";
import type { TransactionSearchFilters } from "./types";

/** Past this many the rest collapse into "+N more"; the workbook lists all. */
const MAX_NAMED_FILTERS = 3;

/** Windows, macOS, SharePoint and the browsers' save paths each reject a
 *  different subset; this removes the union ("Credit/Debit Card" is the
 *  real-world case) and the trailing dots and spaces Windows strips. */
const safeSegment = (value: string) =>
  value
    // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are illegal in filenames
    .replace(/[\u0000-\u001f\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "");

/** Named for the data's date range (PO decision), not the export moment, with
 *  up to three active filters in parentheses:
 *  `2026-08-01 to 2026-08-14 - USTC Fee Payment Summary (Failed, Petition Filing Fee, +1 more).xlsx` */
export const exportFilename = (
  range: AppliedDateRange,
  filters: TransactionSearchFilters,
): string => {
  const from = toDatePickerValue(range.from);
  const to = toDatePickerValue(range.to);
  const span = from === to ? from : `${from} to ${to}`;

  const descriptors = activeExportFilters(filters).map((filter) =>
    safeSegment(filter.descriptor),
  );
  const named = descriptors.slice(0, MAX_NAMED_FILTERS);
  const hidden = descriptors.length - named.length;
  const parts = hidden > 0 ? [...named, `+${hidden} more`] : named;
  const suffix = parts.length > 0 ? ` (${parts.join(", ")})` : "";

  return `${span} - USTC Fee Payment Summary${suffix}.xlsx`;
};
