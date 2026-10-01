import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import {
  COLUMN_LABEL,
  DEFAULT_COLUMN_VISIBILITY,
  getColumns,
  type TransactionColumnId,
} from "./columns";
import type { TransactionLogEntry } from "./types";
import { TRANSACTION_SORT_FIELDS } from "./types";

const columnId = (column: ColumnDef<TransactionLogEntry>) =>
  "accessorKey" in column ? column.accessorKey : column.id;

const columnById = (id: TransactionColumnId) => {
  const column = getColumns().find((c) => columnId(c) === id);
  if (!column) throw new Error(`No column ${id}`);
  return column;
};

const entry = (overrides: Partial<TransactionLogEntry>) =>
  overrides as TransactionLogEntry;

const renderCell = (
  column: ColumnDef<TransactionLogEntry>,
  overrides: Partial<TransactionLogEntry>,
) =>
  // biome-ignore lint/suspicious/noExplicitAny: minimal react-table cell context for the test
  (column.cell as (context: any) => unknown)({
    row: { original: entry(overrides) },
  });

describe("getColumns", () => {
  it("returns a stable reference, so react-table doesn't see new columns every render", () => {
    expect(getColumns()).toBe(getColumns());
  });

  it("lists every column, in the order it's rendered", () => {
    expect(getColumns().map(columnId)).toEqual([
      "createdAt",
      "lastUpdatedAt",
      "feeName",
      "transactionAmount",
      "paymentMethod",
      "paymentStatus",
      "returnDetail",
      "transactionStatus",
      "clientName",
      "transactionReferenceId",
      "paygovTrackingId",
      "agencyTrackingId",
      "metadata.docketNumber",
      "metadata.email",
      "metadata.fullName",
      "metadata.accessCode",
    ]);
  });

  it("makes exactly the API's sort fields sortable", () => {
    const sortable = getColumns()
      .filter((column) => column.enableSorting !== false)
      .map(columnId);

    expect(sortable).toEqual(TRANSACTION_SORT_FIELDS);
  });

  it("labels every column header from COLUMN_LABEL", () => {
    for (const column of getColumns()) {
      const id = columnId(column) as TransactionColumnId;
      expect(column.meta?.headerLabel).toBe(COLUMN_LABEL[id]);
    }
  });

  it("no longer scopes metadata columns to the selected fee", () => {
    const ids = getColumns().map(columnId);

    expect(ids).toContain("metadata.docketNumber");
    expect(ids).toContain("metadata.accessCode");
  });
});

describe("COLUMN_LABEL", () => {
  it("names the fee column Fee", () => {
    expect(COLUMN_LABEL.feeName).toBe("Fee");
  });
});

describe("DEFAULT_COLUMN_VISIBILITY", () => {
  it("has an entry for exactly the columns the table renders", () => {
    expect(Object.keys(DEFAULT_COLUMN_VISIBILITY).sort()).toEqual(
      getColumns().map(columnId).sort(),
    );
  });

  it("shows only Last updated, Fee, Amount and Payment status", () => {
    const visible = Object.entries(DEFAULT_COLUMN_VISIBILITY)
      .filter(([, isVisible]) => isVisible)
      .map(([id]) => id);

    expect(visible).toEqual([
      "lastUpdatedAt",
      "feeName",
      "transactionAmount",
      "paymentStatus",
    ]);
  });
});

describe("tracking ID columns", () => {
  it.each([
    ["paygovTrackingId", "Pay.gov Tracking ID"],
    ["agencyTrackingId", "Agency Tracking ID"],
  ] as const)("renders %s under %s", (id, label) => {
    expect(COLUMN_LABEL[id]).toBe(label);
    expect(
      columnById(id).meta?.copyText?.(
        entry({ paygovTrackingId: "track-1", agencyTrackingId: "track-1" }),
      ),
    ).toBe("track-1");
  });

  it("falls back to an em dash when Pay.gov hasn't assigned an ID", () => {
    const column = columnById("paygovTrackingId");

    expect(column.meta?.copyText?.(entry({ paygovTrackingId: null }))).toBe(
      "—",
    );
  });
});

describe("metadata columns", () => {
  it("reads the value from the row's metadata bag", () => {
    expect(
      renderCell(columnById("metadata.docketNumber"), {
        metadata: { docketNumber: "123-26" },
      }),
    ).toBe("123-26");
  });

  it("falls back to an em dash when the key is missing", () => {
    const column = columnById("metadata.docketNumber");

    expect(renderCell(column, { metadata: {} })).toBe("—");
    expect(renderCell(column, { metadata: null })).toBe("—");
  });
});
