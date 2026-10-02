import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import {
  COLUMN_IDS,
  COLUMN_LABEL,
  DEFAULT_COLUMN_VISIBILITY,
  TRANSACTION_COLUMNS,
  type TransactionColumnId,
} from "./columns";
import type { TransactionLogEntry } from "./types";
import { TRANSACTION_SORT_FIELDS } from "./types";

const columnById = (id: TransactionColumnId) => {
  const column = TRANSACTION_COLUMNS.find((c) => c.id === id);
  if (!column) throw new Error(`No column ${id}`);
  return column;
};

const entry = (overrides: Partial<TransactionLogEntry>) =>
  overrides as TransactionLogEntry;

const renderCell = (
  column: ColumnDef<TransactionLogEntry>,
  overrides: Partial<TransactionLogEntry>,
) =>
  (
    column.cell as unknown as (context: {
      row: { original: TransactionLogEntry };
    }) => unknown
  )({
    row: { original: entry(overrides) },
  });

describe("TRANSACTION_COLUMNS", () => {
  it("lists every column, in the order it's rendered", () => {
    expect(COLUMN_IDS).toEqual([
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
    const sortable = TRANSACTION_COLUMNS.filter(
      (column) => column.enableSorting !== false,
    ).map((column) => column.id);

    expect(sortable).toEqual(TRANSACTION_SORT_FIELDS);
  });

  it("labels every column header from COLUMN_LABEL", () => {
    for (const column of TRANSACTION_COLUMNS) {
      expect(column.meta?.headerLabel).toBe(COLUMN_LABEL[column.id]);
    }
  });

  it("no longer scopes metadata columns to the selected fee", () => {
    expect(COLUMN_IDS).toContain("metadata.docketNumber");
    expect(COLUMN_IDS).toContain("metadata.accessCode");
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
      [...COLUMN_IDS].sort(),
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
