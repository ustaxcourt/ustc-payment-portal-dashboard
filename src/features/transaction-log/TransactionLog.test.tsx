import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/ui/toast-context";
import TimeframeBar from "./TimeframeBar";
import TransactionLog from "./TransactionLog";
import type { TransactionLogResponse } from "./types";

const response = (
  overrides: Partial<TransactionLogResponse> = {},
): TransactionLogResponse => ({
  data: [],
  counts: { all: 0, success: 0, failed: 0, pending: 0 },
  from: "2026-08-03T04:00:00.000Z",
  to: "2026-08-04T04:00:00.000Z",
  page: 1,
  pageSize: 200,
  sort: "createdAt",
  order: "desc",
  total: 0,
  ...overrides,
});

function TestProviders({
  children,
  client,
}: {
  children: React.ReactNode;
  client: QueryClient;
}) {
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}

const renderLog = (
  searchParams = "",
  options: { onUrlUpdate?: OnUrlUpdateFunction } = {},
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <NuqsTestingAdapter searchParams={searchParams} hasMemory {...options}>
      <TestProviders client={client}>
        <TransactionLog />
      </TestProviders>
    </NuqsTestingAdapter>,
  );
};

/** The timeframe presets live in the bar; render both when a flow spans them. */
const renderDashboard = (searchParams = "") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <NuqsTestingAdapter searchParams={searchParams}>
      <TestProviders client={client}>
        <TimeframeBar />
        <TransactionLog />
      </TestProviders>
    </NuqsTestingAdapter>,
  );
};

const mockFetch = (body: TransactionLogResponse) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TransactionLog", () => {
  describe("toolbar", () => {
    it("offers the download control beside the other toolbar actions", async () => {
      mockFetch(response({ data: [{} as never], total: 1 }));

      renderLog();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Download Transaction Log" }),
        ).toHaveAttribute("aria-disabled", "false"),
      );
      expect(
        screen.getByRole("button", { name: "Share View" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Select columns" }),
      ).toBeInTheDocument();
    });

    it("disables the download while the view has no rows", async () => {
      mockFetch(response({ data: [], total: 0 }));

      renderLog();

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Download Transaction Log" }),
        ).toHaveAttribute("aria-disabled", "true"),
      );
    });
  });

  it("announces the order the server confirms", async () => {
    mockFetch(response({ sort: "transactionAmount", order: "desc" }));

    renderLog("?sort=transactionAmount&order=desc");

    await waitFor(() => {
      expect(
        screen.getByText("Sorted by Amount, descending"),
      ).toBeInTheDocument();
    });
  });

  it("announces an ascending order in words, not a symbol", async () => {
    mockFetch(response({ sort: "clientName", order: "asc" }));

    renderLog("?sort=clientName&order=asc");

    await waitFor(() => {
      expect(screen.getByText("Sorted by Client, ascending")).toBeInTheDocument();
    });
  });

  it("asks the api for the ordering held in the url", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=failed&sort=feeName&order=asc");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("sort=feeName");
    expect(requested).toContain("order=asc");
    expect(requested).toContain("status=failed");
  });

  it("keeps whatever sort field is in the url regardless of the payment status filter", async () => {
    // Every column is always rendered now, so there's no tab to fall off of.
    const fetchMock = mockFetch(response());

    renderLog("?status=pending&sort=returnDetail&order=asc");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("sort=returnDetail");
    expect(requested).toContain("order=asc");
  });

  it("fetches immediately with no filters applied", async () => {
    const fetchMock = mockFetch(response());

    renderLog("");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByText("No transactions to show.")).toBeInTheDocument();
    });
  });

  it("forwards fee and pay type filters", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?feeType=PETITION_FILING_FEE&payType=ACH");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("fee=PETITION_FILING_FEE");
    expect(requested).toContain("paymentMethod=ACH");
  });

  it("forwards payment status and transaction status filters", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?status=failed&transactionStatus=processed");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("status=failed");
    expect(requested).toContain("transactionStatus=processed");
  });

  it("runs a metadata lookup carried in the durable URL", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?feeType=NONATTORNEY_EXAM_REGISTRATION_FEE&metadataKey=email&metadataValue=foo@example.com",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = new URL(
      String(fetchMock.mock.calls[0][0]),
      "http://localhost",
    );
    expect(requested.searchParams.get("metadataKey")).toBe("email");
    expect(requested.searchParams.get("metadataValue")).toBe("foo@example.com");
    expect(screen.getByLabelText("Search by Email")).toHaveValue(
      "foo@example.com",
    );
  });

  it("does not query for a metadata key with no value in the URL", async () => {
    const fetchMock = mockFetch(response());

    renderLog("?feeType=PETITION_FILING_FEE&metadataKey=docketNumber");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("fee=PETITION_FILING_FEE");
    expect(requested).not.toContain("metadataKey");
    expect(requested).not.toContain("metadataValue");
  });

  it("drops the metadata params from the URL when the Fee Type changes", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?feeType=NONATTORNEY_EXAM_REGISTRATION_FEE&metadataKey=email&metadataValue=foo",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fetchMock.mockClear();

    await userEvent.click(screen.getByLabelText("Fee Type"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Petition Filing Fee" }),
    );

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes("fee=PETITION_FILING_FEE"),
        ),
      ).toBe(true),
    );
    const petitionRequest = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .find((url) => url.includes("fee=PETITION_FILING_FEE"));
    expect(petitionRequest).not.toContain("metadataKey");
    expect(petitionRequest).not.toContain("metadataValue");
  });

  it("changing the timeframe while a filter is active keeps the filter and updates the range", async () => {
    const fetchMock = mockFetch(response());

    renderDashboard("?feeType=PETITION_FILING_FEE&range=today");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const firstRequest = new URL(
      String(fetchMock.mock.calls[0][0]),
      "http://localhost",
    );
    const firstFrom = firstRequest.searchParams.get("from");

    await userEvent.click(
      screen.getByRole("button", { name: "Last 7 days" }),
    );

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some((call) => {
          const url = new URL(String(call[0]), "http://localhost");
          return (
            url.searchParams.get("from") !== firstFrom &&
            url.searchParams.get("fee") === "PETITION_FILING_FEE"
          );
        }),
      ).toBe(true),
    );
  });

  it("forwards a custom timeframe together with active filters", async () => {
    const fetchMock = mockFetch(response());

    renderLog(
      "?range=custom&from=07/01/2026&to=07/10/2026&transactionStatus=processed",
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const requested = new URL(
      String(fetchMock.mock.calls[0][0]),
      "http://localhost",
    );
    expect(requested.searchParams.get("from")).toBe(
      "2026-07-01T04:00:00.000Z",
    );
    expect(requested.searchParams.get("to")).toBe("2026-07-11T04:00:00.000Z");
    expect(requested.searchParams.get("transactionStatus")).toBe("processed");
  });

  describe("Payment Status filter", () => {
    it("selecting a status option re-fetches with the new status", async () => {
      const fetchMock = mockFetch(response());

      renderLog("");
      await screen.findByText("Failed (0)");

      await userEvent.click(screen.getByText("Failed (0)"));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      const requested = String(fetchMock.mock.calls[1][0]);
      expect(requested).toContain("status=failed");
    });

    it("shows each option's count from the timeframe-wide totals", async () => {
      mockFetch(
        response({ counts: { all: 12, success: 5, failed: 4, pending: 3 } }),
      );

      renderLog("");

      await waitFor(() => {
        expect(screen.getByText("All Payment Status (12)")).toBeInTheDocument();
        expect(screen.getByText("Successful (5)")).toBeInTheDocument();
        expect(screen.getByText("Failed (4)")).toBeInTheDocument();
        expect(screen.getByText("Pending (3)")).toBeInTheDocument();
      });
    });

    it("marks stale rows as updating instead of presenting them as the new filter's results", async () => {
      const staleRow = {
        agencyTrackingId: "agency-1",
        feeName: "Petition Filing Fee",
        fee: "PETITION_FILING_FEE",
        transactionAmount: 60,
        clientName: "payment-portal",
        transactionReferenceId: "ref-1",
        paymentStatus: "success" as const,
        createdAt: "2026-08-03T12:00:00.000Z",
        lastUpdatedAt: "2026-08-03T13:00:00.000Z",
      };

      let resolveSecond: (value: TransactionLogResponse) => void = () => { };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => response({ data: [staleRow], total: 1 }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveSecond = (value) =>
                resolve({ ok: true, status: 200, json: async () => value });
            }),
        );
      vi.stubGlobal("fetch", fetchMock);

      renderLog("");
      await screen.findByText("Petition Filing Fee", { selector: "button" });

      await userEvent.click(screen.getByText("Failed (0)"));

      // The old row stays visible (avoids a blank flash) but is explicitly
      // marked stale rather than silently passed off as the "Failed" results.
      expect(
        screen.getByText("Petition Filing Fee", { selector: "button" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Updating");

      resolveSecond(response({ data: [], counts: { all: 0, success: 0, failed: 0, pending: 0 } }));

      // The "Updating" status is replaced by the empty-results status (not
      // by silence) — the table itself has no rows for a screen reader to
      // land on, so this is what announces the outcome.
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          "No transactions match your filters.",
        ),
      );
      expect(
        screen.queryByText("Petition Filing Fee", { selector: "button" }),
      ).not.toBeInTheDocument();
    });

    it("disables Clear All until a filter is active, then resets on click", async () => {
      const fetchMock = mockFetch(response());

      renderLog("?feeType=PETITION_FILING_FEE");

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Clear All" }),
        ).toBeEnabled(),
      );

      fetchMock.mockClear();
      await userEvent.click(screen.getByRole("button", { name: "Clear All" }));

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Clear All" }),
        ).toBeDisabled(),
      );
    });
  });

  it("copies the current URL and shows a success toast", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: {
        writeText: writeTextMock,
      },
    });

    mockFetch(response());

    window.history.replaceState(
      {},
      "",
      "http://localhost:3000/?status=failed",
    );

    renderLog("?status=failed");

    await userEvent.click(
      screen.getByRole("button", { name: "Share View" }),
    );

    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalled(),
    );

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining("status=failed"),
    );

    expect(
      await screen.findByText("Link copied to clipboard"),
    ).toBeInTheDocument();
  });

  it("shows an error toast when copying the URL fails", async () => {
    const writeTextMock = vi
      .fn()
      .mockRejectedValue(new Error("Clipboard unavailable"));

    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: {
        writeText: writeTextMock,
      },
    });

    mockFetch(response());

    renderLog("?status=failed");

    await userEvent.click(
      screen.getByRole("button", { name: "Share View" }),
    );

    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalled(),
    );

    expect(
      await screen.findByText("Unable to copy link to clipboard."),
    ).toBeInTheDocument();
  });
});

// Below `lg` (1023px) the filters move into a Drawer — forcing the media
// query here is the only way to reach that layout in jsdom, which otherwise
// always reports no match (see vitest.setup.ts).
const stubNarrowViewport = () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(max-width: 1023px)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }));
};

describe("TransactionLog column picker", () => {
  const headers = () =>
    screen.getAllByRole("columnheader").map((header) => header.textContent);

  const openPicker = async () => {
    await userEvent.click(
      screen.getByRole("button", { name: "Select columns" }),
    );
    return screen.findByRole("dialog", { name: "Select columns" });
  };

  const toggleColumn = async (name: string) => {
    const dialog = await openPicker();
    await userEvent.click(within(dialog).getByRole("checkbox", { name }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Select columns" }),
      ).not.toBeInTheDocument(),
    );
  };

  it("shows the four default columns", async () => {
    mockFetch(response());
    renderLog("");

    await waitFor(() =>
      expect(headers()).toEqual([
        "Last updated",
        "Fee",
        "Amount",
        "Payment status",
      ]),
    );
  });

  it("shows a column when it is checked and hides it when unchecked", async () => {
    mockFetch(response());
    renderLog("");

    await toggleColumn("Created");
    expect(headers()).toEqual([
      "Created",
      "Last updated",
      "Fee",
      "Amount",
      "Payment status",
    ]);

    await toggleColumn("Amount");
    expect(headers()).toEqual([
      "Created",
      "Last updated",
      "Fee",
      "Payment status",
    ]);
  });

  it("restores the defaults on Reset to defaults", async () => {
    mockFetch(response());
    renderLog("");

    await toggleColumn("Client");
    const dialog = await openPicker();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Reset to defaults" }),
    );

    expect(headers()).toEqual([
      "Last updated",
      "Fee",
      "Amount",
      "Payment status",
    ]);
  });

  it("keeps the chosen columns when a filter changes", async () => {
    const fetchMock = mockFetch(response());
    renderLog("");

    await toggleColumn("Client");
    await userEvent.click(screen.getByText("Failed (0)"));

    await waitFor(() =>
      expect(fetchMock.mock.calls.at(-1)?.[0]).toContain("status=failed"),
    );
    expect(headers()).toContain("Client");
  });

  it("shows the column a filter searches by", async () => {
    mockFetch(response());
    renderLog("?transactionStatus=cancelled");

    await waitFor(() =>
      expect(headers()).toEqual([
        "Last updated",
        "Fee",
        "Amount",
        "Payment status",
        "Transaction status",
      ]),
    );
  });

  it("shows the metadata column of a metadata search", async () => {
    mockFetch(response());
    renderLog(
      "?feeType=NONATTORNEY_EXAM_REGISTRATION_FEE&metadataKey=email&metadataValue=a%40example.com",
    );

    await waitFor(() => expect(headers()).toContain("Email"));
  });

  it("goes back to the chosen columns once the filter is cleared", async () => {
    mockFetch(response());
    renderLog("?transactionStatus=cancelled");

    await waitFor(() => expect(headers()).toContain("Transaction status"));
    await userEvent.click(screen.getByRole("button", { name: "Clear All" }));

    await waitFor(() =>
      expect(headers()).toEqual([
        "Last updated",
        "Fee",
        "Amount",
        "Payment status",
      ]),
    );
  });

  it("keeps a chosen column when a filter is cleared after unticking the rest", async () => {
    mockFetch(response());
    renderLog("?transactionStatus=cancelled");

    await waitFor(() => expect(headers()).toContain("Transaction status"));
    await toggleColumn("Last updated");
    await toggleColumn("Fee");
    await toggleColumn("Amount");

    const dialog = await openPicker();
    expect(
      within(dialog).getByRole("checkbox", { name: "Payment status" }),
    ).toHaveAttribute("aria-disabled", "true");
    await userEvent.keyboard("{Escape}");

    await userEvent.click(screen.getByRole("button", { name: "Clear All" }));

    await waitFor(() => expect(headers()).toEqual(["Payment status"]));
  });

  it("no longer adds metadata columns when a fee is selected", async () => {
    mockFetch(response());
    renderLog("?feeType=PETITION_FILING_FEE");

    await waitFor(() => expect(headers()).toHaveLength(4));
    expect(headers()).not.toContain("Docket number");
  });

  it("still sorts by a hidden column carried in the url", async () => {
    const fetchMock = mockFetch(response({ sort: "createdAt", order: "desc" }));
    renderLog("?sort=createdAt&order=desc");

    expect(
      await screen.findByText("Sorted by Created, descending"),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[0]).toContain("sort=createdAt");
    expect(headers()).not.toContain("Created");
  });

  it("keeps the chosen columns through an error and retry", async () => {
    const ok = {
      ok: true,
      status: 200,
      json: async () => response(),
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok)
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValue(ok);
    vi.stubGlobal("fetch", fetchMock);
    renderLog("");

    await toggleColumn("Client");
    await userEvent.click(screen.getByText("Failed (0)"));
    await userEvent.click(
      await screen.findByRole("button", { name: "Try again" }),
    );

    await waitFor(() => expect(headers()).toContain("Client"));
  });
});

describe("TransactionLog narrow layout", () => {
  // Returns a `navigate` helper (not RTL's own rerender) that changes the
  // NuqsTestingAdapter's `searchParams` prop on an already-mounted tree —
  // with `hasMemory`, the adapter re-syncs its internal URL state when that
  // prop changes, which is what simulates a real Back/Forward navigation
  // landing on a different committed URL without unmounting anything.
  const renderNarrow = (searchParams = "") => {
    stubNarrowViewport();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const tree = (params: string) => (
      <NuqsTestingAdapter searchParams={params} hasMemory>
        <QueryClientProvider client={client}>
          <ToastProvider>
            <TransactionLog />
          </ToastProvider>
        </QueryClientProvider>
      </NuqsTestingAdapter>
    );
    const result = render(tree(searchParams));
    return {
      ...result,
      navigate: (params: string) => result.rerender(tree(params)),
    };
  };

  const openDrawer = async () => {
    await userEvent.click(screen.getByRole("button", { name: "Show filters" }));
    await screen.findByRole("heading", { name: "Filters" });
  };

  const closeDrawer = async () => {
    await userEvent.click(screen.getByRole("button", { name: "Close filters" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Filters" }),
      ).not.toBeInTheDocument(),
    );
  };

  it("opens the filters drawer from the filter button and closes it with the close button", async () => {
    mockFetch(response());
    renderNarrow();

    expect(
      screen.queryByRole("heading", { name: "Filters" }),
    ).not.toBeInTheDocument();

    await openDrawer();
    await closeDrawer();
  });

  it("shows an indicator on the filter button once a filter is active", async () => {
    mockFetch(response());
    const { container } = renderNarrow("?feeType=PETITION_FILING_FEE");

    expect(container.querySelector(".bg-primary")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show filters" }),
    ).toHaveAccessibleDescription("Filters active");
  });

  it("gives the filter button no active-filter description when nothing is active", async () => {
    mockFetch(response());
    renderNarrow();

    expect(
      screen.getByRole("button", { name: "Show filters" }),
    ).toHaveAccessibleDescription("");
  });

  it("keeps an uncommitted metadata draft when the drawer closes and reopens", async () => {
    mockFetch(response());
    renderNarrow("?feeType=NONATTORNEY_EXAM_REGISTRATION_FEE");

    await openDrawer();
    await userEvent.type(
      screen.getByLabelText("Search by Email"),
      "draft@example.com",
    );
    await closeDrawer();

    await openDrawer();

    expect(screen.getByLabelText("Search by Email")).toHaveValue(
      "draft@example.com",
    );
  });

  it("drops the cached draft once the URL's committed value changes externally", async () => {
    mockFetch(response());
    const { navigate } = renderNarrow(
      "?feeType=NONATTORNEY_EXAM_REGISTRATION_FEE&metadataKey=email&metadataValue=foo%40example.com",
    );

    await openDrawer();
    await userEvent.type(screen.getByLabelText("Search by Email"), "-stale");
    await closeDrawer();

    // Simulates Back/Forward landing on the same key but a different
    // committed value — the scenario the draft cache must not survive.
    navigate(
      "?feeType=NONATTORNEY_EXAM_REGISTRATION_FEE&metadataKey=email&metadataValue=bar%40example.com",
    );

    await openDrawer();

    expect(screen.getByLabelText("Search by Email")).toHaveValue(
      "bar@example.com",
    );
  });
});
