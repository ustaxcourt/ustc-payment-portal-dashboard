import type { Account, NextAuthOptions, Profile, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import AzureADProvider from "next-auth/providers/azure-ad";

interface AzureProfile extends Profile {
  preferred_username: string;
}

const ENVIRONMENT_VARIABLES = [
  "AUTH_MICROSOFT_ENTRA_ID_ID",
  "AUTH_MICROSOFT_ENTRA_ID_SECRET",
  "AUTH_MICROSOFT_ENTRA_ID_ISSUER",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
] as const;

const authCallbacks: NextAuthOptions["callbacks"] = {
  async jwt({
    profile,
    token,
    user,
    account,
  }: {
    profile?: Profile | AzureProfile;
    token: JWT;
    user: User;
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

    return token;
  },
  async session(props) {
    const session = props.session;
    const token = props.token;

    if (session) {
      session.user = token.user as {
        email: string;
        name: string;
        image: string;
        preferred_username?: string;
      };
    }
    return session;
  },
};

const sessionConfig: NextAuthOptions["session"] = {
  maxAge: 60 * 60,
};

const pagesConfig = {
  signIn: "/login",
};

function loadEnv(): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const name of ENVIRONMENT_VARIABLES) {
    const value = process.env[name];
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

  const logoutUrl = new URL(
    `${issuer.replace(/\/v2\.0\/?$/, "").replace(/\/$/, "")}/oauth2/v2.0/logout`,
  );
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
          params: { scope: "openid profile User.Read" },
        },
        httpOptions: { timeout: 10000 },
      }),
    ],
    callbacks: authCallbacks,
  };
}
