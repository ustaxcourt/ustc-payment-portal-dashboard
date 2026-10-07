import fs from "node:fs";
import path from "node:path";
import { test as setup } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { SESSION_MAX_AGE_SECONDS } from "../src/lib/session";
import { STORAGE_STATE } from "./playwright.config";

/** Conditional Access blocks automated sign-in, so the session is minted from
 *  NEXTAUTH_SECRET. Sign-in itself is therefore not covered. */
const readLocalEnv = (key: string): string => {
  const directValue = process.env[key];

  if (directValue) {
    return directValue;
  }

  const file = path.join(__dirname, "..", ".env.local");

  if (!fs.existsSync(file)) {
    throw new Error(`Expected ${file} for ${key}. Copy .env.local.example.`);
  }

  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match?.[1] === key) {
      return match[2].replace(/^["']|["']$/g, "");
    }
  }

  throw new Error(`${key} is not set in ${file}`);
};

setup("mint a dashboard session", async () => {
  const secret = readLocalEnv("NEXTAUTH_SECRET");

  const token = await encode({
    secret,
    maxAge: SESSION_MAX_AGE_SECONDS,
    token: {
      user: {
        email: "e2e@ustaxcourt.gov",
        name: "End To End",
        image: "",
      },
      // Outlives any test run so the jwt callback never attempts a refresh.
      accessToken: "e2e-access-token",
      accessTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
    },
  });

  const state = {
    cookies: [
      {
        name: "next-auth.session-token",
        value: token,
        domain: "localhost",
        path: "/",
        expires: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  fs.writeFileSync(STORAGE_STATE, JSON.stringify(state, null, 2));
});
