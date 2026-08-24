import type { Account, Profile, Session, User } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionAuthOptions, hasValidDashboardSession } from "./auth";
import { AUTH_TOKEN_REFRESH_ERROR } from "./authConstants";

const ENVIRONMENT = {
  AUTH_MICROSOFT_ENTRA_ID_ID: "entra-client-id",
  AUTH_MICROSOFT_ENTRA_ID_SECRET: "entra-client-secret",
  AUTH_MICROSOFT_ENTRA_ID_ISSUER:
    "https://login.microsoftonline.com/test-tenant/v2.0",
  NEXTAUTH_SECRET: "test-nextauth-secret",
  NEXTAUTH_URL: "http://localhost:3000",
} as const;

const originalEnvironment = Object.fromEntries(
  Object.keys(ENVIRONMENT).map((key) => [key, process.env[key]]),
);

const signedInUser: User = {
  id: "user-1",
  name: "Dash Admin",
  email: "dash.admin@example.com",
};

const signedInAdapterUser: AdapterUser = {
  id: "user-1",
  name: "Dash Admin",
  email: "dash.admin@example.com",
  emailVerified: null,
};

type JwtCallbackForTests = (params: {
  account: Account | null;
  profile?: Profile;
  token: JWT;
  user?: User;
}) => Promise<JWT>;

type SessionCallbackForTests = (params: {
  session: Session;
  token: JWT;
  user: AdapterUser;
}) => Promise<Session>;

const getCallbacks = () => {
  const callbacks = getSessionAuthOptions().callbacks;

  if (!callbacks?.jwt || !callbacks.session) {
    throw new Error("Expected auth callbacks to be configured");
  }

  return {
    jwt: callbacks.jwt as JwtCallbackForTests,
    session: callbacks.session as SessionCallbackForTests,
  };
};

const expiredToken = (): JWT => ({
  accessToken: "stale-access-token",
  accessTokenExpires: Date.now() - 60_000,
  refreshToken: "refresh-token-secret",
  user: signedInUser,
});

beforeEach(() => {
  Object.assign(process.env, ENVIRONMENT);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
});

describe("auth token refresh", () => {
  it("refreshes an expired access token and updates its expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00.000Z"));

    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "fresh-access-token",
        expires_in: 3600,
        id_token: "fresh-id-token",
      }),
    });
    vi.stubGlobal("fetch", fetch);

    const refreshedToken = await getCallbacks().jwt({
      account: null,
      profile: undefined,
      token: expiredToken(),
      user: signedInAdapterUser,
    });

    expect(refreshedToken).toMatchObject({
      accessToken: "fresh-access-token",
      accessTokenExpires: Date.now() + 3_600_000,
      idToken: "fresh-id-token",
      refreshToken: "refresh-token-secret",
      user: signedInUser,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token",
    );

    const request = fetch.mock.calls[0]?.[1];
    const body = request?.body as URLSearchParams;
    expect(request?.method).toBe("POST");
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("scope")).toBe("openid profile offline_access User.Read");
  });

  it("stores a rotated refresh token when Entra returns one", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "fresh-access-token",
        expires_in: 3600,
        refresh_token: "rotated-refresh-token",
      }),
    });
    vi.stubGlobal("fetch", fetch);

    const refreshedToken = await getCallbacks().jwt({
      account: null,
      profile: undefined,
      token: expiredToken(),
      user: signedInAdapterUser,
    });

    expect(refreshedToken.refreshToken).toBe("rotated-refresh-token");
  });

  it("marks the token invalid when refresh fails without logging secrets", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: "invalid_grant",
        error_description: "The refresh token has expired.",
      }),
    });
    vi.stubGlobal("fetch", fetch);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const result = await getCallbacks().jwt({
      account: null,
      profile: undefined,
      token: expiredToken(),
      user: signedInAdapterUser,
    });

    expect(result).toMatchObject({
      accessToken: "stale-access-token",
      error: AUTH_TOKEN_REFRESH_ERROR,
      refreshToken: "refresh-token-secret",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      "stale-access-token",
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      "refresh-token-secret",
    );
  });

  it("surfaces refresh failure on the session and treats it as unauthenticated", async () => {
    const session = (await getCallbacks().session({
      session: {
        expires: "2026-08-24T13:00:00.000Z",
        user: undefined,
      } as Session,
      token: {
        error: AUTH_TOKEN_REFRESH_ERROR,
        user: signedInUser,
      } as JWT,
      user: signedInAdapterUser,
    })) as Session & { error?: string };

    expect(session.user).toMatchObject({ email: "dash.admin@example.com" });
    expect(session.error).toBe(AUTH_TOKEN_REFRESH_ERROR);
    expect(hasValidDashboardSession(session)).toBe(false);
  });

  it("keeps the session authenticated after a successful refresh", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "fresh-access-token",
        expires_in: 3600,
      }),
    });
    vi.stubGlobal("fetch", fetch);

    const token = await getCallbacks().jwt({
      account: null,
      profile: undefined,
      token: expiredToken(),
      user: signedInAdapterUser,
    });
    const session = (await getCallbacks().session({
      session: {
        expires: "2026-08-24T13:00:00.000Z",
        user: undefined,
      } as Session,
      token,
      user: signedInAdapterUser,
    })) as Session & { error?: string };

    expect(session.error).toBeUndefined();
    expect(hasValidDashboardSession(session)).toBe(true);
    expect(session.user).toMatchObject({ email: "dash.admin@example.com" });
  });
});
