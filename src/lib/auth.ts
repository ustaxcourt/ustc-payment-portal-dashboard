import type {
  Account,
  NextAuthOptions,
  Profile,
  Session,
  User,
} from "next-auth";
import type { JWT } from "next-auth/jwt";
import AzureADProvider from "next-auth/providers/azure-ad";
import { SESSION_MAX_AGE_SECONDS } from "./session";

interface AzureProfile extends Profile {
  preferred_username: string;
}

interface DashboardJwt extends JWT {
  accessToken?: string;
  accessTokenExpires?: number;
  error?: string;
  idToken?: string;
  profile?: Profile | AzureProfile;
  refreshToken?: string;
  user?: User;
}

interface RefreshTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
}

type DashboardSession = Session & {
  error?: string;
};

export const AUTH_TOKEN_REFRESH_ERROR = "RefreshAccessTokenError";

const ENVIRONMENT_VARIABLES = [
  "AUTH_MICROSOFT_ENTRA_ID_ID",
  "AUTH_MICROSOFT_ENTRA_ID_SECRET",
  "AUTH_MICROSOFT_ENTRA_ID_ISSUER",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
] as const;

const ENTRA_SCOPES = "openid profile offline_access User.Read";

const issuerBaseUrl = (issuer: string) =>
  issuer.replace(/\/v2\.0\/?$/, "").replace(/\/$/, "");

const tokenEndpointUrl = (issuer: string) =>
  `${issuerBaseUrl(issuer)}/oauth2/v2.0/token`;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const asExpiresInSeconds = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue > 0
      ? parsedValue
      : undefined;
  }

  return undefined;
};

async function refreshAccessToken(token: DashboardJwt): Promise<DashboardJwt> {
  const env = loadEnv();
  const issuer = env.AUTH_MICROSOFT_ENTRA_ID_ISSUER;
  const clientId = env.AUTH_MICROSOFT_ENTRA_ID_ID;
  const clientSecret = env.AUTH_MICROSOFT_ENTRA_ID_SECRET;

  if (!issuer || !clientId || !clientSecret || !token.refreshToken) {
    console.error("[auth] access token refresh could not start", {
      hasIssuer: Boolean(issuer),
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      hasRefreshToken: Boolean(token.refreshToken),
    });

    return {
      ...token,
      error: AUTH_TOKEN_REFRESH_ERROR,
    };
  }

  let payload: RefreshTokenResponse | null = null;

  try {
    const response = await fetch(tokenEndpointUrl(issuer), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
        scope: ENTRA_SCOPES,
      }),
    });

    payload = (await response
      .json()
      .catch(() => null)) as RefreshTokenResponse | null;

    if (!response.ok) {
      console.error("[auth] access token refresh failed", {
        status: response.status,
        error: asString(payload?.error),
        errorDescription: asString(payload?.error_description),
      });

      return {
        ...token,
        error: AUTH_TOKEN_REFRESH_ERROR,
      };
    }
  } catch (error) {
    console.error("[auth] access token refresh request threw", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      ...token,
      error: AUTH_TOKEN_REFRESH_ERROR,
    };
  }

  const nextAccessToken = asString(payload?.access_token);
  const expiresInSeconds = asExpiresInSeconds(payload?.expires_in);

  if (!nextAccessToken || !expiresInSeconds) {
    console.error(
      "[auth] access token refresh returned an incomplete payload",
      {
        hasAccessToken: Boolean(nextAccessToken),
        hasExpiresIn: Boolean(expiresInSeconds),
      },
    );

    return {
      ...token,
      error: AUTH_TOKEN_REFRESH_ERROR,
    };
  }

  return {
    ...token,
    accessToken: nextAccessToken,
    accessTokenExpires: Date.now() + expiresInSeconds * 1000,
    error: undefined,
    idToken: asString(payload?.id_token) ?? token.idToken,
    refreshToken: asString(payload?.refresh_token) ?? token.refreshToken,
  };
}

export function hasValidDashboardSession(
  session: Session | null | undefined,
): session is Session {
  return (
    session !== null &&
    session !== undefined &&
    (session as DashboardSession).error !== AUTH_TOKEN_REFRESH_ERROR
  );
}

const authCallbacks: NextAuthOptions["callbacks"] = {
  async jwt({
    profile,
    token,
    user,
    account,
  }: {
    profile?: Profile | AzureProfile;
    token: JWT;
    user?: User;
    account: Account | null;
  }) {
    if (account && user) {
      return {
        accessToken: account.access_token,
        idToken: account.id_token,
        accessTokenExpires: account?.expires_at ? account.expires_at * 1000 : 0,
        refreshToken: account.refresh_token,
        profile,
        user: {
          ...user,
          email:
            profile && "preferred_username" in profile
              ? profile.preferred_username
              : "",
        },
      };
    }

    const dashboardToken = token as DashboardJwt;

    if (
      dashboardToken.accessTokenExpires &&
      Date.now() < dashboardToken.accessTokenExpires
    ) {
      return dashboardToken;
    }

    if (!dashboardToken.refreshToken) {
      return {
        ...dashboardToken,
        error: AUTH_TOKEN_REFRESH_ERROR,
      };
    }

    return refreshAccessToken(dashboardToken);
  },
  async session(props) {
    const session = props.session;
    const token = props.token as DashboardJwt;

    if (session) {
      session.user = token.user as {
        email: string;
        name: string;
        image: string;
        preferred_username?: string;
      };
      (session as DashboardSession).error = token.error;
    }
    return session;
  },
};

const sessionConfig: NextAuthOptions["session"] = {
  maxAge: SESSION_MAX_AGE_SECONDS,
};

const pagesConfig = {
  signIn: "/login",
};

function loadEnv(): Record<string, string> {
  const resolved: Record<string, string> = {};
  const environmentValues: Record<
    (typeof ENVIRONMENT_VARIABLES)[number],
    string | undefined
  > = {
    AUTH_MICROSOFT_ENTRA_ID_ID: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
    AUTH_MICROSOFT_ENTRA_ID_SECRET: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
    AUTH_MICROSOFT_ENTRA_ID_ISSUER: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  };

  for (const name of ENVIRONMENT_VARIABLES) {
    const value = environmentValues[name];
    if (value) resolved[name] = value;
  }

  return resolved;
}

let cached: NextAuthOptions | undefined;

/**
 * Resolved lazily. `next build` imports every route to collect page data, so
 * reading configuration at module scope would make the build require env vars.
 */
export function getAuthOptions(): NextAuthOptions {
  cached ??= buildAuthOptions();
  return cached;
}

export function getSessionAuthOptions(): Pick<
  NextAuthOptions,
  "callbacks" | "secret" | "session"
> {
  const env = loadEnv();

  return {
    secret: env.NEXTAUTH_SECRET,
    session: sessionConfig,
    callbacks: authCallbacks,
  };
}

export function getFederatedLogoutUrl(
  postLogoutPath = "/login",
): string | null {
  const env = loadEnv();
  const issuer = env.AUTH_MICROSOFT_ENTRA_ID_ISSUER;
  const baseUrl = env.NEXTAUTH_URL;

  if (!issuer || !baseUrl) {
    return null;
  }

  const logoutUrl = new URL(`${issuerBaseUrl(issuer)}/oauth2/v2.0/logout`);
  const postLogoutRedirectUrl = new URL(postLogoutPath, baseUrl);

  logoutUrl.searchParams.set(
    "post_logout_redirect_uri",
    postLogoutRedirectUrl.toString(),
  );

  return logoutUrl.toString();
}

function buildAuthOptions(): NextAuthOptions {
  const env = loadEnv();

  const missing = ENVIRONMENT_VARIABLES.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing Entra configuration: ${missing.join(", ")}. Expected these values in the Next.js server runtime environment. For Amplify SSR, provide them via environment variables; the build can write non-public values to .env.production but NEXTAUTH_URL must be exported in the build environment.`,
    );
  }

  const tenantId = env.AUTH_MICROSOFT_ENTRA_ID_ISSUER.replace(
    /^https:\/\/login\.microsoftonline\.com\//,
    "",
  )
    .replace(/\/v2\.0\/?$/, "")
    .replace(/\/$/, "");

  return {
    secret: env.NEXTAUTH_SECRET,
    session: sessionConfig,
    pages: pagesConfig,
    providers: [
      AzureADProvider({
        clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
        clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
        tenantId,
        authorization: {
          params: { scope: ENTRA_SCOPES },
        },
        httpOptions: { timeout: 10000 },
      }),
    ],
    callbacks: authCallbacks,
  };
}
