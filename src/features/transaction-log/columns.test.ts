import { describe, expect, it } from "vitest";
import {
  COLUMN_LABEL,
  getColumns,
  isSortableOnTab,
  metadataColumns,
} from "./columns";
import type { TransactionLogEntry } from "./types";
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

describe("getColumns", () => {
  it("returns a stable reference per tab, so react-table doesn't see new columns every render", () => {
    for (const tab of [...TRANSACTION_TABS, "search"] as const) {
      expect(getColumns(tab)).toBe(getColumns(tab));
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

describe("metadataColumns", () => {
  const renderCell = (
    // biome-ignore lint/suspicious/noExplicitAny: minimal react-table cell context for the test
    column: any,
    metadata: Record<string, string> | null | undefined,
  ) =>
    column.cell({
      row: { original: { metadata } as TransactionLogEntry },
    });

  it("returns one non-sortable column per key of a single-key fee", () => {
    const columns = metadataColumns("PETITION_FILING_FEE");

    expect(columns).toHaveLength(1);
    expect(columns[0]).toMatchObject({
      id: "metadata.docketNumber",
      header: "Docket Number",
      enableSorting: false,
    });
  });

  it("returns a column per key, in order, for a multi-key fee", () => {
    expect(
      metadataColumns("NONATTORNEY_EXAM_REGISTRATION_FEE").map((c) => c.id),
    ).toEqual(["metadata.email", "metadata.fullName", "metadata.accessCode"]);
  });

  it("has no metadata columns when no fee is selected", () => {
    expect(metadataColumns(null)).toEqual([]);
  });

  it("reads the value from the row's metadata bag", () => {
    const [column] = metadataColumns("PETITION_FILING_FEE");

    expect(renderCell(column, { docketNumber: "123-26" })).toBe("123-26");
  });

  it("falls back to an em dash when the key is missing", () => {
    const [column] = metadataColumns("PETITION_FILING_FEE");

    expect(renderCell(column, {})).toBe("—");
    expect(renderCell(column, null)).toBe("—");
  });

  it("is kept out of the sortable set", () => {
    // Metadata columns carry no accessorKey, so isSortableOnTab never matches.
    for (const column of metadataColumns("NONATTORNEY_EXAM_REGISTRATION_FEE")) {
      expect(column).not.toHaveProperty("accessorKey");
    }
  });
});
