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

### @tanstack/react-table 8.21.3 → 9.3.1 — deferred (2026-08-04, re-confirmed 2026-10-21)

- **Current:** `8.21.3` (pinned exactly, not `^8`). **Available latest:** `9.3.1`.
- **Reason:** v9 renames the table hook and changes its types, so the upgrade is a
  source migration rather than a lockfile refresh. Sized on 2026-10-14:
  - **Surface:** three files — `src/features/transaction-log/TransactionTable.tsx`,
    `columns.tsx` and `columns.test.ts`. The table uses only the core row model
    with `manualSorting`, plus sorting and column-visibility state. No client-side
    filtering, pagination or grouping.
  - **Changes:** `useReactTable` + `getCoreRowModel()` become `useTable({ features,
    columns, data })` with the sorting and column-visibility features registered.
    `ColumnDef<TData>` gains a leading `TFeatures` generic, which has to be threaded
    through `columns.tsx`, the table props and the test. The `ColumnMeta` module
    augmentation keeps working with `TFeatures` as its first generic.
  - **Unchanged:** `flexRender`, `getHeaderGroups`, `getRowModel`,
    `getIsSorted`/`toggleSorting`/`getCanSort`, `manualSorting`, and controlled
    `state` with `onSortingChange`. v9 methods live on the prototype, but the table
    only destructures the `{ row }` and `{ column }` context objects, not methods.
  - **Estimate:** about 3 points. The code change is small, but the transaction log
    is the app's riskiest surface (timeframe, filters, sorting, column visibility
    and export must stay coherent), so it needs a full manual pass and e2e run.
- **Plan:** Migrate under its own ticket rather than a dependency rotation. Skip
  v9's deprecated `useLegacyTable` bridge, which would mean migrating twice. Keep
  the exact pin so automated updates cannot pull in v9.

### next 15.5.28 → 16.4.2 — deferred (2026-07-27, re-confirmed 2026-10-21)

- **Current:** `15.5.28` (pinned exactly, not a range). **Available latest:** `16.4.2`.
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
- **Re-checked 2026-10-21:** The Amplify Hosting docs still state support for apps
  "built with Next.js versions up through Next.js 15", and compute-managed SSR for
  "versions 12 through 15". No Next 16 support has been announced. `15.5.28` is
  still the newest 15.5.x (the `backport` dist-tag).
- **Note:** Staying on 15.x is not the same as staying still. PAY-494 moved
  15.5.26 → 15.5.28 within the pin. 15.5.28 (2026-10-14) is a security release:
  GHSA-2464-fhr4-w9xw (critical, unauthenticated RCE in the Image Optimization API
  when processing SVGs) and GHSA-p3m5-59mp-jv5r (high, App Router Server Actions
  DoS). This app is in scope for the first: `src/app/page.tsx` uses `next/image`,
  and `src/middleware.ts` excludes `_next/image` from the auth gate, so the
  optimizer endpoint is reachable without login. Patch releases on the 15.5 line should continue
  to be taken promptly while Next 16 remains deferred.

### typescript 5.9.3 → 7.0.2 — deferred (2026-09-17, re-confirmed 2026-10-21)

- **Current:** `^5.9.3`. **Available latest:** `7.0.2`.
- **Reason:** TypeScript 7 is the native port, and it breaks `next build` on
  Next 15.5 (first seen on 15.5.25, still failing on 15.5.28). `tsc --noEmit` and the full unit suite both pass on 7.0.2, so the
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

- **Plan:** Revisit when Next.js supports the TypeScript 7 compiler API for
  `next.config.ts` loading. Tied to the Next 16 entry above: check both together,
  and re-test with `npm run build`, not just `npm run tsc` — a passing typecheck
  hides this failure entirely.

### @types/node 24.19.2 → 26.6.5 — deferred (2026-09-17, re-confirmed 2026-10-21)

- **Current:** `^24.13.3` (resolves to `24.19.2`). **Available latest:** `26.6.5`.
- **Reason:** `@types/node` majors track Node.js majors. This app runs Node 24 —
  `.nvmrc` pins 24.22.1, `package.json` `engines` requires `>=24.22.1 <25.0.0`,
  and CI resolves its Node from `.nvmrc`. Amplify does too: `amplify.yml` runs
  `nvm install` before `npm ci --engine-strict`, and Amplify runs the app on the
  Node major it was built with. Before 2026-10-22 it skipped this and built on the
  image default, Node 22.18.0. Installing types for Node 26 against a
  Node 24 runtime would let the typechecker accept APIs that do not exist in
  production, which is worse than being a major behind.
- **Plan:** Bump in lockstep with the Node runtime, not on its own. When this app
  moves to Node 26, move `@types/node` with it in the same change.

### traverse 0.3.9 → 0.3.10 — held back via override (2026-10-15, re-confirmed 2026-10-21)

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
  remains vendored inside `next@15.5.28` at
  `node_modules/next/node_modules/postcss` (still `8.4.31`). We do not control that
  pin. The only remediation offered by `npm audit` is upgrading to `next@16.4.2`,
  which is currently deferred (see Deferred upgrades). This is also the only reason
  `npm audit` still lists `next` itself (moderate): GHSA-4jqv-mc3x-m676 and
  GHSA-mcj8-r9mp-w47p (SSG/ISR cache poisoning) were resolved by the move to
  `next@15.5.28` on 2026-10-14.
- **Mitigation:** All four advisories require attacker-controlled CSS reaching
  the compiler. This application compiles only first-party CSS during CI/build
  and does not process user-supplied stylesheets.
- **Revisit:** Re-test whenever a new 15.5.x patch is released or when the
  deferred Next 16 upgrade is revisited. Remove this entry once Next ships a
  patched bundled PostCSS version. Re-confirmed 2026-10-21: still `8.4.31`.

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
  once a fix lands. Re-confirmed 2026-10-21: `braces` latest is still `3.0.3`.

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
  Re-confirmed 2026-10-21: `exceljs` latest is still `4.4.0`.
