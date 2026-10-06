import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { COLUMN_LABEL, type TransactionColumnId } from "./columnLabels";
import {
  COLUMN_IDS,
  type ColumnVisibility,
  DEFAULT_COLUMN_VISIBILITY,
  defaultColumnVisibility,
  searchedColumnIds,
  TRANSACTION_COLUMNS,
  withFeeDefaults,
  withSearchedColumns,
} from "./columns";
import type { TransactionLogEntry, TransactionSearchFilters } from "./types";
import { TRANSACTION_SORT_FIELDS } from "./types";

const visibleIds = (visibility: ColumnVisibility) =>
  COLUMN_IDS.filter((id) => visibility[id]);

const onlyVisible = (id: TransactionColumnId): ColumnVisibility =>
  Object.fromEntries(
    COLUMN_IDS.map((columnId) => [columnId, columnId === id]),
  ) as ColumnVisibility;

const METADATA_COLUMN_IDS = COLUMN_IDS.filter((id) =>
  id.startsWith("metadata."),
);

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

  it("defines a column for every metadata key, whatever the selected fee", () => {
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
    ["paygovTrackingId", "Pay.gov tracking ID"],
    ["agencyTrackingId", "Agency tracking ID"],
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

describe("searchedColumnIds", () => {
  const noFilters: TransactionSearchFilters = {
    feeType: null,
    payType: null,
    paymentStatus: null,
    transactionStatus: null,
    metadataKey: null,
    metadataValue: null,
  };

  it("is empty with no filters", () => {
    expect(searchedColumnIds(noFilters)).toEqual([]);
  });

  it("maps each active filter to the column it searches", () => {
    expect(
      searchedColumnIds({
        feeType: "PETITION_FILING_FEE",
        payType: "ACH",
        paymentStatus: "failed",
        transactionStatus: "cancelled",
        metadataKey: "docketNumber",
        metadataValue: "123-26",
      }),
    ).toEqual([
      "feeName",
      "paymentMethod",
      "paymentStatus",
      "transactionStatus",
      "metadata.docketNumber",
    ]);
  });

  it("ignores a metadata key until it has a value to search", () => {
    expect(
      searchedColumnIds({ ...noFilters, metadataKey: "email" }),
    ).toEqual([]);
  });
});

describe("withSearchedColumns", () => {
  it("returns the same visibility when every searched column is already shown", () => {
    expect(
      withSearchedColumns(DEFAULT_COLUMN_VISIBILITY, ["feeName"]),
    ).toBe(DEFAULT_COLUMN_VISIBILITY);
  });

  it("shows searched columns without changing the visibility passed in", () => {
    const shown = withSearchedColumns(DEFAULT_COLUMN_VISIBILITY, [
      "transactionStatus",
      "metadata.email",
    ]);

    expect(shown).toEqual({
      ...DEFAULT_COLUMN_VISIBILITY,
      transactionStatus: true,
      "metadata.email": true,
    });
    expect(DEFAULT_COLUMN_VISIBILITY.transactionStatus).toBe(false);
  });
});

describe("defaultColumnVisibility", () => {
  it("matches DEFAULT_COLUMN_VISIBILITY when no fee is selected", () => {
    expect(defaultColumnVisibility(null)).toEqual(DEFAULT_COLUMN_VISIBILITY);
  });

  it.each([
    ["PETITION_FILING_FEE", ["metadata.docketNumber"]],
    [
      "NONATTORNEY_EXAM_REGISTRATION_FEE",
      ["metadata.email", "metadata.fullName", "metadata.accessCode"],
    ],
  ] as const)("adds only the %s metadata columns to the defaults", (feeType, metadataIds) => {
    expect(visibleIds(defaultColumnVisibility(feeType))).toEqual([
      "lastUpdatedAt",
      "feeName",
      "transactionAmount",
      "paymentStatus",
      ...metadataIds,
    ]);
  });

  it("does not change DEFAULT_COLUMN_VISIBILITY", () => {
    defaultColumnVisibility("PETITION_FILING_FEE");

    expect(DEFAULT_COLUMN_VISIBILITY["metadata.docketNumber"]).toBe(false);
  });
});

describe("withFeeDefaults", () => {
  it("keeps the admin's non-metadata choices", () => {
    const chosen = {
      ...DEFAULT_COLUMN_VISIBILITY,
      clientName: true,
      transactionAmount: false,
    };

    expect(withFeeDefaults(chosen, "PETITION_FILING_FEE")).toEqual({
      ...chosen,
      "metadata.docketNumber": true,
    });
  });

  it("swaps the metadata columns when the fee changes", () => {
    const petition = defaultColumnVisibility("PETITION_FILING_FEE");

    expect(
      withFeeDefaults(petition, "NONATTORNEY_EXAM_REGISTRATION_FEE"),
    ).toEqual(defaultColumnVisibility("NONATTORNEY_EXAM_REGISTRATION_FEE"));
  });

  it("hides every metadata column when no fee is selected", () => {
    const allMetadata = {
      ...DEFAULT_COLUMN_VISIBILITY,
      ...Object.fromEntries(METADATA_COLUMN_IDS.map((id) => [id, true])),
    };

    expect(withFeeDefaults(allMetadata, null)).toEqual(
      DEFAULT_COLUMN_VISIBILITY,
    );
  });

  it("replaces metadata choices the admin made by hand", () => {
    const handPicked = {
      ...defaultColumnVisibility("NONATTORNEY_EXAM_REGISTRATION_FEE"),
      "metadata.email": false,
      "metadata.docketNumber": true,
    };

    expect(withFeeDefaults(handPicked, "PETITION_FILING_FEE")).toEqual(
      defaultColumnVisibility("PETITION_FILING_FEE"),
    );
  });

  it("does not change the visibility passed in", () => {
    const petition = defaultColumnVisibility("PETITION_FILING_FEE");

    withFeeDefaults(petition, null);

    expect(petition["metadata.docketNumber"]).toBe(true);
  });

  it("falls back to the defaults rather than leave no column visible", () => {
    expect(withFeeDefaults(onlyVisible("metadata.docketNumber"), null)).toEqual(
      DEFAULT_COLUMN_VISIBILITY,
    );
  });
});
