import type { Account, NextAuthOptions, Profile, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import AzureADProvider from "next-auth/providers/azure-ad";

interface AzureProfile extends Profile {
  preferred_username: string;
}

/**
 * Amplify Gen 1 exposes environment secrets as a JSON string in
 * `process.env.secrets`, not as individual variables, so fall back to it.
 */
function readEnv(name: string): string | undefined {
  const direct = process.env[name];
  if (direct) return direct;

  const blob = process.env.secrets;
  if (!blob) return undefined;

  try {
    return (JSON.parse(blob) as Record<string, string>)[name];
  } catch {
    return undefined;
  }
}

function getEntraConfig() {
  const clientId = readEnv("AUTH_MICROSOFT_ENTRA_ID_ID");
  const clientSecret = readEnv("AUTH_MICROSOFT_ENTRA_ID_SECRET");
  const issuer = readEnv("AUTH_MICROSOFT_ENTRA_ID_ISSUER");

  const missing = [
    !clientId && "AUTH_MICROSOFT_ENTRA_ID_ID",
    !clientSecret && "AUTH_MICROSOFT_ENTRA_ID_SECRET",
    !issuer && "AUTH_MICROSOFT_ENTRA_ID_ISSUER",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing Entra environment variables: ${missing.join(", ")}`,
    );
  }

  const tenantId = (issuer as string)
    .replace(/^https:\/\/login\.microsoftonline\.com\//, "")
    .replace(/\/v2\.0\/?$/, "")
    .replace(/\/$/, "");

  return {
    clientId: clientId as string,
    clientSecret: clientSecret as string,
    tenantId,
  };
}

export function getAuthOptions(): NextAuthOptions {
  const { clientId, clientSecret, tenantId } = getEntraConfig();

  return {
    secret: readEnv("NEXTAUTH_SECRET"),
    providers: [
      AzureADProvider({
        clientId,
        clientSecret,
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
