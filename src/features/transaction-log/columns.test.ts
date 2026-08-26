import { describe, expect, it } from "vitest";
import { COLUMN_LABEL, getColumns, isSortableOnTab } from "./columns";
import { TRANSACTION_SORT_FIELDS, TRANSACTION_TABS } from "./types";

describe("isSortableOnTab", () => {
  it("reports Failure reason only where the column is rendered", () => {
    expect(isSortableOnTab("returnDetail", "all")).toBe(true);
    expect(isSortableOnTab("returnDetail", "failed")).toBe(true);
    expect(isSortableOnTab("returnDetail", "success")).toBe(false);
    expect(isSortableOnTab("returnDetail", "pending")).toBe(false);
  });

  it("matches the columns actually rendered by the Search tab", () => {
    // TransactionSearch renders getColumns("search"); if the two ever
    // disagree, sorting by a column Search shows silently no-ops there
    // and only takes effect once the URL's sort field lands on a tab
    // that does render it.
    expect(isSortableOnTab("returnDetail", "search")).toBe(true);
    expect(
      getColumns("search").some(
        (column) => (column as { accessorKey?: string }).accessorKey === "returnDetail",
      ),
    ).toBe(true);
  });

  it("reports every other column on every tab", () => {
    const alwaysPresent = TRANSACTION_SORT_FIELDS.filter(
      (field) => field !== "returnDetail",
    );

    for (const tab of TRANSACTION_TABS) {
      for (const field of alwaysPresent) {
        expect(isSortableOnTab(field, tab)).toBe(true);
      }
    }
  });
});

describe("COLUMN_LABEL", () => {
  it("names every sortable column", () => {
    for (const field of TRANSACTION_SORT_FIELDS) {
      expect(COLUMN_LABEL[field]).toBeTruthy();
    }
  });
});
