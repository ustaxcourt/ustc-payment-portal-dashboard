import { describe, expect, it } from "vitest";
import { COLUMN_LABEL, getColumns, metadataColumns } from "./columns";
import type { TransactionLogEntry } from "./types";
import { TRANSACTION_SORT_FIELDS } from "./types";

describe("getColumns", () => {
  it("returns a stable reference, so react-table doesn't see new columns every render", () => {
    expect(getColumns()).toBe(getColumns());
  });

  it("includes every sortable field, in the order it's rendered", () => {
    const accessorKeys = getColumns().map((column) =>
      "accessorKey" in column ? column.accessorKey : column.id,
    );
    expect(accessorKeys).toEqual(TRANSACTION_SORT_FIELDS);
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
    // Metadata columns carry no accessorKey, so they're never sortable.
    for (const column of metadataColumns("NONATTORNEY_EXAM_REGISTRATION_FEE")) {
      expect(column).not.toHaveProperty("accessorKey");
    }
  });
});
