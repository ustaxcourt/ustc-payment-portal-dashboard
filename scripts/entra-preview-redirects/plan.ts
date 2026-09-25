import { readFileSync } from "node:fs";

// Keep in sync with preview_branch_patterns in terraform/environments/dev/main.tf.
export const PREVIEW_BRANCH_PATTERNS = ["PAY-*", "feature/*"];

export const MAX_REDIRECT_URIS = 256;

const CALLBACK_PATH = "/api/auth/callback/azure-ad";

export type PlanInput = {
  current: string[];
  branches: string[];
  amplifyAppId: string;
  maxRemovals: number;
};

export type Plan = {
  next: string[];
  added: string[];
  removed: string[];
  skipped: { branch: string; reason: string }[];
};

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
}

const previewPatterns = PREVIEW_BRANCH_PATTERNS.map(globToRegExp);

export function isPreviewBranch(branch: string): boolean {
  return previewPatterns.some((pattern) => pattern.test(branch));
}

// Must match the NEXTAUTH_URL rule in amplify.yml, or Entra rejects the login.
export function previewSubdomain(branch: string): string {
  return branch.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

export function previewRedirectUri(branch: string, amplifyAppId: string): string {
  return `https://${previewSubdomain(branch)}.${amplifyAppId}.amplifyapp.com${CALLBACK_PATH}`;
}

// The only URIs this job may add or remove; everything else is left alone.
export function isOwnedUri(uri: string, amplifyAppId: string): boolean {
  return new RegExp(
    `^https://[a-z0-9-]+\\.${amplifyAppId}\\.amplifyapp\\.com${CALLBACK_PATH}$`,
  ).test(uri);
}

function assertStringArray(value: unknown, name: string): asserts value is string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${name} must be an array of strings`);
  }
}

export function planRedirectUris(input: PlanInput): Plan {
  const { current, branches, amplifyAppId, maxRemovals } = input;

  assertStringArray(current, "current");
  assertStringArray(branches, "branches");
  if (typeof amplifyAppId !== "string" || !/^[a-z0-9]+$/.test(amplifyAppId)) {
    throw new Error(`amplifyAppId is invalid: ${JSON.stringify(amplifyAppId)}`);
  }
  if (!Number.isInteger(maxRemovals) || maxRemovals < 0) {
    throw new Error(`maxRemovals must be a non-negative integer, got ${maxRemovals}`);
  }

  const desired = new Set<string>();
  const skipped: Plan["skipped"] = [];

  for (const branch of branches) {
    if (!isPreviewBranch(branch)) continue;

    if (!/^[\x21-\x7e]+$/.test(branch)) {
      skipped.push({ branch, reason: "contains non-ASCII or whitespace characters" });
      continue;
    }
    if (previewSubdomain(branch).length > 63) {
      skipped.push({ branch, reason: "subdomain exceeds the 63-character DNS label limit" });
      continue;
    }
    desired.add(previewRedirectUri(branch, amplifyAppId));
  }

  const removed = current.filter((uri) => isOwnedUri(uri, amplifyAppId) && !desired.has(uri));
  const added = [...desired].filter((uri) => !current.includes(uri)).sort();
  const next = [...current.filter((uri) => !removed.includes(uri)), ...added];

  if (removed.length > maxRemovals) {
    throw new Error(
      `Refusing to remove ${removed.length} URIs (limit ${maxRemovals}). Re-run with a higher max_removals if this is intended.`,
    );
  }
  if (next.length > MAX_REDIRECT_URIS) {
    throw new Error(`Plan has ${next.length} redirect URIs; Entra allows ${MAX_REDIRECT_URIS}`);
  }
  for (const uri of current) {
    if (!isOwnedUri(uri, amplifyAppId) && !next.includes(uri)) {
      throw new Error(`Plan would drop a URI this job does not own: ${uri}`);
    }
  }

  return { next, added, removed, skipped };
}

if (import.meta.main) {
  try {
    const plan = planRedirectUris(JSON.parse(readFileSync(0, "utf8")));
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
