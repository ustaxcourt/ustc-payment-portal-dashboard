// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  isPreviewBranch,
  MAX_REDIRECT_URIS,
  type PlanInput,
  planRedirectUris,
  previewSubdomain,
  STATIC_REDIRECT_URIS,
} from "./plan";

const APP_ID = "d2xd0ob1rbbqjb";
const uri = (subdomain: string) =>
  `https://${subdomain}.${APP_ID}.amplifyapp.com/api/auth/callback/azure-ad`;

// Real entries the dev app has held that match neither list, so must be removed.
const JUNK = [
  "https://payment.example.com/oauth/callback",
  "https://pay-452-search-and-table-dashboard-refactor.d2xd0ob1rbbqjb.amplifyapp.com",
  "https://pay-1-old.dotherappid.amplifyapp.com/api/auth/callback/azure-ad",
];

const plan = (overrides: Partial<PlanInput>) =>
  planRedirectUris({
    current: STATIC_REDIRECT_URIS,
    branches: [],
    amplifyAppId: APP_ID,
    maxRemovals: 10,
    ...overrides,
  });

describe("previewSubdomain", () => {
  it.each([
    ["PAY-460-fix-random-logout", "pay-460-fix-random-logout"],
    ["PAY-451-PAY-427-Dependency-Updates", "pay-451-pay-427-dependency-updates"],
    ["feature/Foo_Bar", "feature-foo-bar"],
    ["feature/a.b/c", "feature-a-b-c"],
  ])("maps %s to %s like amplify.yml", (branch, expected) => {
    expect(previewSubdomain(branch)).toBe(expected);
  });
});

describe("isPreviewBranch", () => {
  it.each([
    ["PAY-461-dependency-updates", true],
    ["feature/foo", true],
    ["feature/foo/bar", true],
    ["main", false],
    ["pay-461-lowercase", false],
    ["Adds-PR-Summary-And-Agents-File", false],
    ["featurefoo", false],
  ])("%s -> %s", (branch, expected) => {
    expect(isPreviewBranch(branch)).toBe(expected);
  });
});

describe("planRedirectUris", () => {
  it("adds URIs for existing preview branches and ignores other branches", () => {
    const result = plan({ branches: ["PAY-461-deps", "main", "Adds-Agents-File"] });

    expect(result.added).toEqual([uri("pay-461-deps")]);
    expect(result.removed).toEqual([]);
    expect(result.next).toEqual([...STATIC_REDIRECT_URIS, uri("pay-461-deps")]);
  });

  it("removes preview URIs whose branch no longer exists", () => {
    const current = [uri("pay-331-sso"), ...STATIC_REDIRECT_URIS, uri("pay-451-deps")];
    const result = plan({ current, branches: ["PAY-451-deps"] });

    expect(result.removed).toEqual([uri("pay-331-sso")]);
    expect(result.next).toEqual([...STATIC_REDIRECT_URIS, uri("pay-451-deps")]);
  });

  it("removes URIs that are neither static nor from a branch", () => {
    const result = plan({ current: [...STATIC_REDIRECT_URIS, ...JUNK] });

    expect(result.removed).toEqual(JUNK);
    expect(result.next).toEqual(STATIC_REDIRECT_URIS);
  });

  it("restores missing static URIs", () => {
    const result = plan({ current: [] });

    expect(result.added).toEqual([...STATIC_REDIRECT_URIS].sort());
    expect(result.removed).toEqual([]);
  });

  it("makes no changes when run on its own output", () => {
    const first = plan({ current: [uri("pay-1-old"), ...JUNK], branches: ["PAY-2-new", "feature/x"] });
    const second = plan({ current: first.next, branches: ["PAY-2-new", "feature/x"] });

    expect(second.added).toEqual([]);
    expect(second.removed).toEqual([]);
    expect(second.next).toEqual(first.next);
  });

  it("adds one URI when two branches map to the same subdomain", () => {
    expect(plan({ branches: ["feature/a_b", "feature/a.b"] }).added).toEqual([uri("feature-a-b")]);
  });

  it("returns additions in sorted order", () => {
    expect(plan({ branches: ["PAY-9", "PAY-10", "feature/a"] }).added).toEqual([
      uri("feature-a"),
      uri("pay-10"),
      uri("pay-9"),
    ]);
  });

  it("skips branches whose subdomain would not match amplify.yml", () => {
    const longBranch = `PAY-${"x".repeat(60)}`;
    const result = plan({ branches: ["PAY-1-café", longBranch] });

    expect(result.added).toEqual([]);
    expect(result.skipped.map((s) => s.branch)).toEqual(["PAY-1-café", longBranch]);
  });

  describe("safety limits", () => {
    const stale = Array.from({ length: 11 }, (_, i) => uri(`pay-${i}-stale`));

    it("refuses to remove more than maxRemovals URIs", () => {
      expect(() => plan({ current: stale, maxRemovals: 10 })).toThrow(/Refusing to remove 11 URIs/);
    });

    it("allows the removal when maxRemovals is raised", () => {
      expect(plan({ current: stale, maxRemovals: 11 }).removed).toHaveLength(11);
    });

    it("refuses a plan over Entra's redirect URI limit", () => {
      const branches = Array.from({ length: MAX_REDIRECT_URIS + 1 }, (_, i) => `PAY-${i}`);
      expect(() => plan({ branches })).toThrow(/Entra allows 256/);
    });
  });

  describe("input validation", () => {
    it.each<[string, Record<string, unknown>, RegExp]>([
      ["current", { current: "nope" }, /current must be an array/],
      ["branches", { branches: [1] }, /branches must be an array/],
      ["amplifyAppId", { amplifyAppId: "" }, /amplifyAppId is invalid/],
      ["amplifyAppId with regex characters", { amplifyAppId: "d.*" }, /amplifyAppId is invalid/],
      ["maxRemovals", { maxRemovals: -1 }, /maxRemovals must be/],
    ])("rejects a bad %s", (_name, overrides, message) => {
      expect(() => plan(overrides as Partial<PlanInput>)).toThrow(message);
    });
  });
});
