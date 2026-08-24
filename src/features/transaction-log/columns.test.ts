import { describe, expect, it } from "vitest";
import { COLUMN_LABEL, isSortableOnTab } from "./columns";
import { TRANSACTION_SORT_FIELDS, TRANSACTION_TABS } from "./types";

describe("isSortableOnTab", () => {
  it("reports Failure reason only where the column is rendered", () => {
    expect(isSortableOnTab("returnDetail", "all")).toBe(true);
    expect(isSortableOnTab("returnDetail", "failed")).toBe(true);
    expect(isSortableOnTab("returnDetail", "success")).toBe(false);
    expect(isSortableOnTab("returnDetail", "pending")).toBe(false);
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

  it("matches the All tab's columns on the search tab", () => {
    for (const field of TRANSACTION_SORT_FIELDS) {
      expect(isSortableOnTab(field, "search")).toBe(
        isSortableOnTab(field, "all"),
      );
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
