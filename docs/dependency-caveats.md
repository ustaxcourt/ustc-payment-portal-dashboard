# Dependency Caveats

This document records dependencies that are intentionally **not** on their latest
version, and vulnerabilities that could not be resolved, along with the reasoning.
It is a required artifact of the recurring dependency-update work.

When you defer an upgrade or accept a vulnerability, add a dated entry below with
enough context that the next person doesn't have to re-derive the decision.

---

## How to use this file

- **Deferred upgrade** → add an entry under [Deferred upgrades](#deferred-upgrades)
  with the package, current vs. available version, the reason for waiting, and a
  link to any follow-up ticket.
- **Accepted vulnerability** → add an entry under
  [Accepted vulnerabilities](#accepted-vulnerabilities) with the advisory ID,
  severity, why it can't be fixed now, and any mitigation.
- **Vulnerability fixed by an `overrides` entry** → add an entry under
  [Vulnerabilities resolved via override](#vulnerabilities-resolved-via-override)
  with the advisory, why the parent cannot reach a fix, and when to remove it.
- If an upgrade is involved enough to warrant its own ticket, cut the ticket,
  notify the PO, and reference it here.

---

## Deferred upgrades

### next 15.5.29 → 16.4.6 — deferred (2026-07-27, re-confirmed 2026-11-09)

- **Current:** `15.5.29` (pinned exactly, not a range). **Available latest:** `16.4.6`.
- **Reason:** AWS Amplify Hosting — the hosting target chosen for this app — documents
  Next.js support through version 15. Next 16 is not officially supported, and the
  Amplify Hosting issue tracker carries a concrete failure for it: _"Next.js 16.1 build
  fails with EEXIST error: Turbopack creates symlinks in `.next/node_modules` that
  Amplify bundler cannot handle,"_ plus open reports of WEB_COMPUTE builds stuck in
  provisioning and SSR compute hangs. We were exposed to that failure by default: Next 16
  makes Turbopack the default build engine, so a plain `next build` produced
  `▲ Next.js 16.x (Turbopack)` with no opt-in. On the 15.5.x line the build runs on
  webpack.
- **Plan:** Upgrade when Amplify documents Next 16 support, then prove it with a
  preview-branch build before merging. Pinned exactly rather than `^15` so the major cannot drift in
  through a lockfile refresh. **This pin is contingent on the Amplify hosting decision
  (ADR 0001 open question 3); if the team selects OpenNext instead, re-evaluate rather
  than assuming the pin is still required.**
- **Re-checked 2026-11-09:** The Amplify Hosting docs still state support "up
  through Next.js 15", and compute-managed SSR for "versions 12 through 15". The
  EEXIST issue quoted above (aws-amplify/amplify-hosting#4074) was closed as
  completed on 2026-02-17, but users reported the same failure on Next 16.2.9 as
  late as 2026-07-03, so it is not evidence that Next 16 deploys cleanly. The
  deferral now rests on the documented support alone. `15.5.29` is the newest
  15.5.x (the `backport` dist-tag), and `next build` still runs on webpack.
- **Note:** Staying on 15.x is not the same as staying still. Patch releases on
  the 15.5 line should continue to be taken promptly while Next 16 remains
  deferred.
  - **15.5.28 (2026-10-14, PAY-494):** GHSA-2464-fhr4-w9xw (critical,
    unauthenticated RCE in the Image Optimization API when processing SVGs) and
    GHSA-p3m5-59mp-jv5r (high, App Router Server Actions DoS). This app is in scope
    for the first: `src/app/page.tsx` uses `next/image`, and `src/middleware.ts`
    excludes `_next/image` from the auth gate, so the optimizer endpoint is
    reachable without login.
  - **15.5.29 (2026-11-03, PAY-507):** three moderate advisories, published on the
    Next.js repository rather than the global advisory database, so `npm audit`
    does not flag them.
    - GHSA-7qx7-33qx-rqx2 (SVG rejection bypass in image optimization): **in
      scope**, for the same reason as GHSA-2464-fhr4-w9xw.
    - GHSA-pc58-hwjq-p385 (response desync when a route handler returns a fetched
      upstream response unchanged): **not in scope**. `src/app/api/transactions`
      and `src/app/api/totals` read the upstream body and build a new
      `NextResponse`, so upstream framing never reaches the client.
    - GHSA-f3mh-rxg3-f5g2 (HttpOnly cookies duplicated into an internal header
      when an Edge runtime route handler sets them through `NextResponse`): **not
      in scope**. No route handler sets `runtime = "edge"`. The session cookie is
      set by the NextAuth handler on the Node runtime, and `src/middleware.ts` only
      reads it.

### typescript 5.9.3 → 7.0.2 — deferred (2026-09-17, re-confirmed 2026-11-09)

- **Current:** `^5.9.3`. **Available latest:** `7.0.2`.
- **Reason:** TypeScript 7 is the native port, and it breaks `next build` on
  Next 15.5 (first seen on 15.5.25, still failing on 15.5.29). `tsc --noEmit` and the full unit suite both pass on 7.0.2, so the
  app's own types are fine — but Next loads `next.config.ts` through the TypeScript
  compiler API, and against 7.x that path throws:

  ```text
  ⨯ Failed to load next.config.ts
  [TypeError: Cannot read properties of undefined (reading 'fileExists')]
  ```

  The build fails before compiling anything. Verified by reverting to 5.9.3 on an
  otherwise identical tree, where the build succeeds — so this is the TypeScript
  major, not anything else in this cycle.

- **Re-checked 2026-10-21:** Same failure on `next@15.5.28` with `typescript@7.0.2`.
  On the same tree with `typescript@5.9.3`, `next build` loads `next.config.ts` and
  proceeds to compile.

- **Re-checked 2026-11-09:** Same failure on `next@15.5.29` with `typescript@7.0.2`.

- **Plan:** Revisit when Next.js supports the TypeScript 7 compiler API for
  `next.config.ts` loading. Tied to the Next 16 entry above: check both together,
  and re-test with `npm run build`, not just `npm run tsc` — a passing typecheck
  hides this failure entirely.

### @types/node 24.19.2 → 26.6.6 — deferred (2026-09-17, re-confirmed 2026-11-09)

- **Current:** `^24.13.3` (resolves to `24.19.2`). **Available latest:** `26.6.6`.
- **Reason:** `@types/node` majors track Node.js majors. This app runs Node 24 —
  `.nvmrc` pins `24.22.1`, `package.json` `engines` requires
  `>=24.22.1 <25.0.0`, and CI resolves its Node version from `.nvmrc`.
  Amplify does too: `amplify.yml` runs `nvm install` before `npm ci` (strict via
  `.npmrc` `engine-strict`), and Amplify runs the app on the Node major it was
  built with (Node.js version support for Next.js apps). Before 2026-10-22 it
  skipped this and built on the image default, Node 22.18.0. Only the major
  carries over, and AWS picks the patch version. Installing Node 26 type
  definitions against a Node 24 runtime would let the typechecker accept APIs
  that do not exist in production, which is worse than being a major behind.
- **Runtime patch check:** Because AWS picks the patch, a Node security release
  is not fixed in production when `.nvmrc` moves. AWS's rollout of 24.22.1 lagged
  the 2026-10-21 release (aws-amplify/amplify-hosting#4111). `src/instrumentation.ts`
  logs `[dashboard] Node.js runtime v24.x.y` once per server start, so list the
  versions seen in the last week with:

  ```sh
  aws logs filter-log-events --no-cli-pager \
    --log-group-name /aws/amplify/<app-id> \
    --filter-pattern '"Node.js runtime"' \
    --start-time $(( ($(date +%s) - 7*86400) * 1000 )) \
    --query 'events[].message' --output text | tr '\t' '\n' | sort -u
  ```

  If any version is older than the fix, add an entry under
  [Accepted vulnerabilities](#accepted-vulnerabilities) until AWS catches up.
  On 2026-11-09 the dev app logged only `v24.22.2`, which closed the
  October 2026 entry. That check covered dev alone: stg and prod have never
  completed an Amplify build, so they serve no SSR traffic and log no runtime
  version. Run the same check against their app IDs once they go live.
- **Plan:** Bump in lockstep with the Node runtime, not on its own. When this app
  moves to Node 26, move `@types/node` with it in the same change.

### traverse 0.3.9 → 0.3.10 — held back via override (2026-10-15, re-confirmed 2026-11-09)

- **Current:** `0.3.9` (forced by `package.json` `overrides`). **Available latest
  in range:** `0.3.10`.
- **Reason:** `traverse` reaches the production tree only through `exceljs` →
  `unzipper` → `binary` → `chainsaw` (`traverse@>=0.3.0 <0.4`). `0.3.10`
  (2026-10-07) adds no fix for this line; it swaps built-ins for polyfill
  packages, which pulled about 78 extra packages into the production install.
  `0.3.9` has no published advisories (`npm audit` is clean for it).
- **Verification:** `npm ls traverse` shows `traverse@0.3.9 overridden` under
  `chainsaw`. Re-test the Excel export when this override changes.
- **Remove when:** an advisory is published against `traverse` 0.3.x, or
  `exceljs` stops depending on `unzipper@0.10`. Re-run `npm audit` on each
  dependency update to catch the first case.

<!-- Format:
### <package> <current> → <available> — deferred (<date>)

- **Current:** `<version/range>`. **Available latest:** `<version>`.
- **Reason:** ...
- **Plan:** ... (link a follow-up ticket if one is cut; flag the PO if pursued)
-->

---

## Accepted vulnerabilities

### GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849 — postcss@8.4.31 (high)

- **Reason it can't be fixed now:** These four advisories together cover
  `postcss <= 8.5.22`. Our direct dependency tree is already clear —
  `@tailwindcss/postcss` resolves a patched PostCSS version. The flagged copy
  remains vendored inside `next@15.5.29` at
  `node_modules/next/node_modules/postcss` (still `8.4.31`). We do not control that
  pin. The only remediation offered by `npm audit` is upgrading to `next@16.4.6`,
  which is currently deferred (see Deferred upgrades). This is also the only reason
  `npm audit` still lists `next` itself (moderate): GHSA-4jqv-mc3x-m676 and
  GHSA-mcj8-r9mp-w47p (SSG/ISR cache poisoning) were resolved by the move to
  `next@15.5.28` on 2026-10-14.
- **Mitigation:** All four advisories require attacker-controlled CSS reaching
  the compiler. This application compiles only first-party CSS during CI/build
  and does not process user-supplied stylesheets.
- **Revisit:** Re-test whenever a new 15.5.x patch is released or when the
  deferred Next 16 upgrade is revisited. Remove this entry once Next ships a
  patched bundled PostCSS version. Re-confirmed 2026-11-09: still `8.4.31` in
  `next@15.5.29`.

### GHSA-g3hv-75wg-m249 — minimatch@10.2.6 (moderate) (2026-11-09)

- **Reason it can't be fixed now:** `minimatch` 7.0.0 through 11.0.0 can be driven
  into excessive work by glob patterns that expand into many parts. The fix is
  `11.0.1`, a new major. It reaches us only through the `shadcn` CLI
  (devDependency): `shadcn` → `ts-morph@26.0.0` → `@ts-morph/common@0.27.0`, which
  declares `minimatch@^10.0.1`. The newest `@ts-morph/common` (`0.29.0`) still
  declares `^10.0.1`, so no upstream release reaches the fix. An override to 11 was
  rejected because it would force a major outside the range `@ts-morph/common`
  declares, and the CLI is not covered by our tests, so a break would surface only
  the next time someone adds a component. `npm audit`'s suggested "fix"
  (downgrading `shadcn` to 1.0.0) is not real remediation.
- **Mitigation:** Exploiting it needs attacker-controlled glob patterns. `shadcn` is
  a dev-time CLI used to add components, not shipped in the app bundle or run at
  request time, and it only globs our own repository.
- **Revisit:** When `@ts-morph/common` accepts `minimatch@^11`, or `shadcn` moves
  off `ts-morph`. Re-run `npm audit` on each dependency update.

### GHSA-gcqx-w48m-w2h4 — deepmerge@4.3.1 (low) (2026-11-09)

- **Reason it can't be fixed now:** `deepmerge` 4.2.0 through 4.3.1 lets merged
  input poison the prototype of the returned object. The advisory has **no patched
  version**, and `4.3.1` (last published 2023-03-16) is the latest release. It
  reaches us only through the `shadcn` CLI (devDependency), directly and through
  `@shadcn/registry@0.2.1`. `npm audit`'s suggested "fix" (downgrading `shadcn` to
  1.0.0) is not real remediation.
- **Mitigation:** Exploiting it needs attacker-controlled objects reaching the
  merge. The CLI merges our local `components.json` and, during `shadcn add`, the
  `tailwind`, `cssVars`, `css` and `envVars` of registry items it fetches. That
  second input is remote: `components.json` sets `"registries": {}`, so the only
  source is the default registry at `ui.shadcn.com`, over HTTPS. The CLI runs only
  when a developer adds a component, its output goes through code review like any
  other change, and it is not shipped in the app bundle or run at request time.
- **Revisit:** When `deepmerge` publishes a fix or `shadcn` drops it. Re-run
  `npm audit` on each dependency update. **Re-assess before adding a third-party
  registry to `components.json`**, because that would let a source we don't
  control feed the merge.

<!-- Format:
### <advisory-id> — <package>@<version> (<severity>)

- **Reason it can't be fixed now:** ...
- **Mitigation:** ...
- **Revisit:** <condition or date>
-->

---

## Vulnerabilities resolved via override

### GHSA-w5hq-g745-h8pq — uuid < 11.1.1 (moderate) — overridden to `11.1.1` (2026-09-18, documented 2026-10-14)

- **Advisory:** `uuid` before 11.1.1 is missing a buffer bounds check in v3/v5/v6
  when a `buf` argument is provided.
- **Why an override:** `exceljs@4.4.0` (the latest release, unchanged since
  December 2024) depends on `uuid@^8.3.0`, which cannot reach a fixed version.
  `package.json` `overrides` forces `"uuid": "11.1.1"` for the whole tree;
  `next-auth@4.24.15` (`uuid@^11.1.1`) dedupes onto the same copy. Added in PAY-455.
- **Verification:** `npm ls uuid` shows `uuid@11.1.1 overridden` under `exceljs`,
  and the Excel export works. Re-test export when this override changes.
- **Remove when:** `exceljs` publishes a release that depends on `uuid >= 11.1.1`.
  Drop the override then, rather than moving it to a newer `uuid` major.
  Re-confirmed 2026-11-09: `exceljs` latest is still `4.4.0`.
