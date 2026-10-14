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
- If an upgrade is involved enough to warrant its own ticket, cut the ticket,
  notify the PO, and reference it here.

---

## Deferred upgrades

### @tanstack/react-table 8.21.3 → 9.2.6 — deferred (2026-08-04, re-confirmed 2026-10-06)

- **Current:** `8.21.3` (pinned exactly, not `^8`). **Available latest:** `9.2.6`.
- **Reason:** v9 is not backward compatible with the v8 API used throughout the
  transaction log. The application currently imports and relies on v8-specific
  APIs including `useReactTable` and `getCoreRowModel`. Attempting to resolve the
  dependency to v9 causes build failures such as:
  `Export getCoreRowModel doesn't exist in target module` and
  `Export useReactTable doesn't exist in target module`.
  The migration requires source changes rather than a lockfile refresh. The
  shadcn table examples and existing transaction-log implementation are still
  based on the v8 API surface.
- **Plan:** Remain on v8 until there is a planned effort to migrate the
  transaction-log components to the v9 API. The upgrade should include a review
  of all table-related components, sorting behavior, and tests. Pin the package
  exactly to prevent automated dependency-update workflows from introducing v9.

### next 15.5.28 → 16.4.1 — deferred (2026-07-27, re-confirmed 2026-10-14)

- **Current:** `15.5.28` (pinned exactly, not a range). **Available latest:** `16.4.1`.
- **Reason:** AWS Amplify Hosting — the hosting target chosen for this app — documents
  Next.js support through version 15. Next 16 is not officially supported, and the
  Amplify Hosting issue tracker carries a concrete failure for it: _"Next.js 16.1 build
  fails with EEXIST error: Turbopack creates symlinks in `.next/node_modules` that
  Amplify bundler cannot handle,"_ plus open reports of WEB_COMPUTE builds stuck in
  provisioning and SSR compute hangs. We were exposed to that failure by default: Next 16
  makes Turbopack the default build engine, so a plain `next build` produced
  `▲ Next.js 16.x (Turbopack)` with no opt-in. On the 15.5.x line the build runs on
  webpack.
- **Plan:** Upgrade when Amplify documents Next 16 support and the Turbopack bundler
  issue is closed. Pinned exactly rather than `^15` so the major cannot drift in
  through a lockfile refresh. **This pin is contingent on the Amplify hosting decision
  (ADR 0001 open question 3); if the team selects OpenNext instead, re-evaluate rather
  than assuming the pin is still required.**
- **Re-checked 2026-10-14:** The Amplify Hosting docs still state support for apps
  "built with Next.js versions up through Next.js 15", and compute-managed SSR for
  "versions 12 through 15". No Next 16 support has been announced.
- **Note:** Staying on 15.x is not the same as staying still. This cycle moved
  15.5.26 → 15.5.28 within the pin. Patch releases on the 15.5 line should continue
  to be taken promptly while Next 16 remains deferred.

### typescript 5.9.3 → 7.0.2 — deferred (2026-09-17, re-confirmed 2026-10-14)

- **Current:** `^5.9.3`. **Available latest:** `7.0.2`.
- **Reason:** TypeScript 7 is the native port, and it breaks `next build` on
  Next 15.5.25. `tsc --noEmit` and the full unit suite both pass on 7.0.2, so the
  app's own types are fine — but Next loads `next.config.ts` through the TypeScript
  compiler API, and against 7.x that path throws:

  ```text
  ⨯ Failed to load next.config.ts
  [TypeError: Cannot read properties of undefined (reading 'fileExists')]
  ```

  The build fails before compiling anything. Verified by reverting to 5.9.3 on an
  otherwise identical tree, where the build succeeds — so this is the TypeScript
  major, not anything else in this cycle.

- **Re-checked 2026-10-14:** Same failure on `next@15.5.28` with `typescript@7.0.2`.
  On the same tree with `typescript@5.9.3`, `next build` loads `next.config.ts` and
  proceeds to compile.

- **Plan:** Revisit when Next.js supports the TypeScript 7 compiler API for
  `next.config.ts` loading. Tied to the Next 16 entry above: check both together,
  and re-test with `npm run build`, not just `npm run tsc` — a passing typecheck
  hides this failure entirely.

### @types/node 24.19.1 → 26.6.4 — deferred (2026-09-17, re-confirmed 2026-10-02)

- **Current:** `^24.19.1`. **Available latest:** `26.6.4`.
- **Reason:** `@types/node` majors track Node.js majors. This app runs Node 24 —
  `.nvmrc` pins 24.20.0, `package.json` `engines` requires `>=24.20.0 <25.0.0`,
  and CI resolves its Node from `.nvmrc`. Installing types for Node 26 against a
  Node 24 runtime would let the typechecker accept APIs that do not exist in
  production, which is worse than being a major behind.
- **Plan:** Bump in lockstep with the Node runtime, not on its own. When this app
  moves to Node 26, move `@types/node` with it in the same change.

### axe-core 4.13.0 → 4.14.0 — deferred (2026-10-14)

- **Current:** `4.13.0` (pinned exactly). **Available latest:** `4.14.0`.
- **Reason:** `axe-core` is pinned to the same version as `@axe-core/playwright`,
  which drives the accessibility suite (`npm run test:a11y`). The latest
  `@axe-core/playwright` is still `4.13.0`, so moving `axe-core` alone would run the
  a11y checks on a rules engine the Playwright integration was not released against.
- **Plan:** Bump `axe-core` and `@axe-core/playwright` together once
  `@axe-core/playwright` 4.14.x is published, and re-run `npm run test:a11y`.

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
  remains vendored inside `next@15.5.28` at
  `node_modules/next/node_modules/postcss` (still `8.4.31`). We do not control that
  pin. The only remediation offered by `npm audit` is upgrading to `next@16.4.1`,
  which is currently deferred (see Deferred upgrades). This is also the only reason
  `npm audit` still lists `next` itself (moderate): GHSA-4jqv-mc3x-m676 and
  GHSA-mcj8-r9mp-w47p (SSG/ISR cache poisoning) were resolved by the move to
  `next@15.5.28` on 2026-10-14.
- **Mitigation:** All four advisories require attacker-controlled CSS reaching
  the compiler. This application compiles only first-party CSS during CI/build
  and does not process user-supplied stylesheets.
- **Revisit:** Re-test whenever a new 15.5.x patch is released or when the
  deferred Next 16 upgrade is revisited. Remove this entry once Next ships a
  patched bundled PostCSS version.

### GHSA-vfj7-8cjw-p6xm — braces@3.0.3 (high)

- **Reason it can't be fixed now:** `braces` through 3.0.3 has recursive AST walkers
  with no depth guard, so deeply nested brace patterns exhaust the call stack. The
  advisory (published 2026-09-18) has **no patched version**. It reaches us only
  through the `shadcn` CLI (devDependency): `shadcn` → `fast-glob` → `micromatch` →
  `braces` (and `@ts-morph/common` → `fast-glob`). `npm audit` flags `shadcn`,
  `@shadcn/registry`, `@ts-morph/common`, `fast-glob`, `micromatch` and `braces` for
  this one advisory; its suggested "fix" (downgrading `shadcn` to 1.0.0) is not real
  remediation.
- **Mitigation:** Exploiting it needs attacker-controlled brace patterns reaching
  `braces`. It is a dev-time CLI used to add components, not shipped in the app
  bundle or run at request time, and it only globs our own repository.
- **Revisit:** When `braces` publishes a patched release, or `shadcn`/`fast-glob`
  moves off it. Re-run `npm audit` on each dependency update and remove this entry
  once a fix lands.

<!-- Format:
### <advisory-id> — <package>@<version> (<severity>)

- **Reason it can't be fixed now:** ...
- **Mitigation:** ...
- **Revisit:** <condition or date>
-->
