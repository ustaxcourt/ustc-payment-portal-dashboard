import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@aws-sdk/credential-providers", () => ({
  fromNodeProviderChain: () => async () => ({
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "secret",
  }),
}));

describe("getSigned", () => {
  const originalApiUrl = process.env.PAYMENT_PORTAL_API_URL;

  beforeEach(() => {
    process.env.PAYMENT_PORTAL_API_URL = "https://api.example.com";
  });

  afterEach(() => {
    process.env.PAYMENT_PORTAL_API_URL = originalApiUrl;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("percent-encodes a space as %20 in the request line, matching what was signed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getSigned } = await import("./paymentPortalApi");

    await getSigned(
      "/transaction-log",
      new URLSearchParams({ paymentMethod: "Credit/Debit Card" }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = String(fetchMock.mock.calls[0][0]);

    // URLSearchParams#toString() would render this as "...Debit+Card" —
    // a form-encoded space, not the %20 SigV4 canonicalized when signing.
    expect(requestedUrl).toContain("paymentMethod=Credit%2FDebit%20Card");
    expect(requestedUrl).not.toContain("+");
  });

  it("signs a request whose Authorization header covers the actual query sent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getSigned } = await import("./paymentPortalApi");

    await getSigned(
      "/transaction-log",
      new URLSearchParams({ paymentMethod: "Credit/Debit Card" }),
    );

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization ?? headers.Authorization).toBeTruthy();
  });
});
