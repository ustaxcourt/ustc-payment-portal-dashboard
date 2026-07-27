import type { Account, NextAuthOptions, Profile, User } from "next-auth";
import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import AzureADProvider from "next-auth/providers/azure-ad";

interface AzureProfile extends Profile {
  preferred_username: string;
}

const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER;

if (!clientId || !clientSecret || !tenantId) {
    throw new Error("Missing Azure AD environment variables");
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
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
      // console.log("user", user);
      // console.log("account", account);
      // console.log("profile", profile);
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
      // console.log(token);
      // console.log("idtoken", token.idToken);
      console.log("profile", token.profile);
      const { profile } = token;
      console.log("profile", profile);
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
} satisfies NextAuthOptions;

export default NextAuth(authOptions);
