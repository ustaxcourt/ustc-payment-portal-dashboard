import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
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


function secretPrefix(): string | undefined {
  const explicit = process.env.SSM_SECRET_PREFIX;
  if (explicit) return explicit.endsWith("/") ? explicit : `${explicit}/`;

  const appId = process.env.AWS_APP_ID;
  return appId ? `/amplify/shared/${appId}/` : undefined;
}

async function loadSecrets(): Promise<Record<string, string>> {
  const fromEnv: Record<string, string> = {};
  for (const name of SECRET_NAMES) {
    const value = process.env[name];
    if (value) fromEnv[name] = value;
  }
  if (Object.keys(fromEnv).length === SECRET_NAMES.length) return fromEnv;

  const prefix = secretPrefix();
  if (!prefix) return fromEnv;

  const client = new SSMClient({});

  const response = await client.send(
    new GetParametersCommand({
      Names: SECRET_NAMES.map((name) => `${prefix}${name}`),
      WithDecryption: true,
    }),
  );

  const fromSsm: Record<string, string> = {};
  for (const parameter of response.Parameters ?? []) {
    if (parameter.Name && parameter.Value) {
      fromSsm[parameter.Name.replace(prefix, "")] = parameter.Value;
    }
  }

  return { ...fromSsm, ...fromEnv };
}

let cached: Promise<NextAuthOptions> | undefined;

/**
 * Built lazily and memoised. `next build` imports every route to collect page
 * data, so resolving configuration at module scope would make the build depend
 * on runtime secrets.
 */
export function getAuthOptions(): Promise<NextAuthOptions> {
  cached ??= buildAuthOptions().catch((error) => {
    cached = undefined; // allow the next request to retry
    throw error;
  });
  return cached;
}

async function buildAuthOptions(): Promise<NextAuthOptions> {
  const secrets = await loadSecrets();

  const missing = SECRET_NAMES.filter((name) => !secrets[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing Entra configuration: ${missing.join(", ")}. Expected environment variables, or SSM parameters under /amplify/shared/<appId>/.`,
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
