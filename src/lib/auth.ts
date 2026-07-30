import type { Account, NextAuthOptions, Profile, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import AzureADProvider from "next-auth/providers/azure-ad";

interface AzureProfile extends Profile {
  preferred_username: string;
}

const SECRET_NAMES = [
  "AUTH_MICROSOFT_ENTRA_ID_ID",
  "AUTH_MICROSOFT_ENTRA_ID_SECRET",
  "AUTH_MICROSOFT_ENTRA_ID_ISSUER",
  "NEXTAUTH_SECRET",
] as const;


function loadSecrets(): Record<string, string> {
  const resolved: Record<string, string> = {};

  let injected: Record<string, string> = {};
  const blob = process.env.secrets;
  if (blob) {
    try {
      injected = JSON.parse(blob) as Record<string, string>;
    } catch {
      injected = {};
    }
  }

  for (const name of SECRET_NAMES) {
    const value = process.env[name] ?? injected[name];
    if (value) resolved[name] = value;
  }

  return resolved;
}

let cached: NextAuthOptions | undefined;

/**
 * Resolved lazily. `next build` imports every route to collect page data, so
 * reading configuration at module scope would make the build require secrets.
 */
export function getAuthOptions(): NextAuthOptions {
  cached ??= buildAuthOptions();
  return cached;
}

function buildAuthOptions(): NextAuthOptions {
  const secrets = loadSecrets();

  const missing = SECRET_NAMES.filter((name) => !secrets[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing Entra configuration: ${missing.join(", ")}. Expected these values in the Next.js server runtime environment. For Amplify SSR, copy the required variables into .env.production during the build.`,
    );
  }

  const tenantId = secrets.AUTH_MICROSOFT_ENTRA_ID_ISSUER.replace(
    /^https:\/\/login\.microsoftonline\.com\//,
    "",
  )
    .replace(/\/v2\.0\/?$/, "")
    .replace(/\/$/, "");

  return {
    secret: secrets.NEXTAUTH_SECRET,
    providers: [
      AzureADProvider({
        clientId: secrets.AUTH_MICROSOFT_ENTRA_ID_ID,
        clientSecret: secrets.AUTH_MICROSOFT_ENTRA_ID_SECRET,
        tenantId,
        authorization: {
          params: { scope: "openid profile User.Read" },
        },
        httpOptions: { timeout: 10000 },
      }),
    ],
    callbacks: {
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
            accessTokenExpires: account?.expires_at
              ? account.expires_at * 1000
              : 0,
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
    },
  };
}
