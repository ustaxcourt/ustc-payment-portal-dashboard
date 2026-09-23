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

### @tanstack/react-table 8.21.3 → 9.2.4 — deferred (2026-08-04, re-confirmed 2026-09-17, reconfirmed)

- **Current:** `8.21.3` (pinned exactly, not `^8`). **Available latest:** `9.0.0`.
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

### hashicorp/aws provider 6.56.0 → 6.65.0 — deferred (2026-07-29, re-confirmed 2026-09-17)

- **Current:** `6.56.0` (pinned exactly, not `~> 6.0`). **Available latest:** `6.65.0`.
- **Reason:** 6.57.0 fails reading the GitHub OIDC provider. Every `terraform plan`
  errors on the `aws_iam_openid_connect_provider` data source with
  `ListOpenIDConnectProviders ... StatusCode: 302, api error UnknownError`. The AWS
  CLI makes the identical call successfully against the same credentials and account,
  and every apply on 6.56.0 worked, so this is a provider regression rather than a
  network, permissions, or configuration problem. It blocks all four Terraform roots,
  since each reads that data source through `modules/iam`.
- **Status as of 2026-09-17:** The original revisit condition — "revisit when 6.58.0
  ships" — is now met on the calendar: 6.58.0 through 6.65.0 have all shipped.
  It is **not** met on the evidence. Every shipped release from 6.57.0 through
  6.65.0 was checked, and none mentions the `ListOpenIDConnectProviders`
  regression or any other OIDC fix. So there is no published reason to believe the
  bug is fixed — only that nobody has said otherwise.
- **Plan:** Kept pinned. Clearing this entry requires a real `terraform plan` in
  `environments/dev` against AWS — `terraform validate` cannot exercise the data
  source, because the failure only appears when the provider actually calls IAM.
  That needs credentials, so it is a task for someone with dev access:
  relax to `~> 6.0`, run `terraform plan`, and confirm the data source reads.
  Pinned exactly in the meantime so `terraform init -upgrade` cannot silently
  reintroduce it.

### next 15.5.25 → 16.3.5 — deferred (2026-07-27, re-confirmed 2026-09-17)

- **Current:** `15.5.25` (pinned exactly, not a range). **Available latest:** `16.3.5`.
- **Reason:** AWS Amplify Hosting — the hosting target chosen for this app — documents
  Next.js support through version 15. Next 16 is not officially supported, and the
  Amplify Hosting issue tracker carries a concrete failure for it: _"Next.js 16.1 build
  fails with EEXIST error: Turbopack creates symlinks in `.next/node_modules` that
  Amplify bundler cannot handle,"_ plus open reports of WEB_COMPUTE builds stuck in
  provisioning and SSR compute hangs. We were exposed to that failure by default: Next 16
  makes Turbopack the default build engine, so a plain `next build` produced
  `▲ Next.js 16.2.12 (Turbopack)` with no opt-in. On the 15.5.x line the build runs on
  webpack.
- **Plan:** Upgrade when Amplify documents Next 16 support and the Turbopack bundler
  issue is closed. Pinned exactly rather than `^15` so the major cannot drift back in
  through a lockfile refresh. **This pin is contingent on the Amplify hosting decision
  (ADR 0001 open question 3); if the team selects OpenNext instead, re-evaluate rather
  than assuming the pin is still required.**
- **Note:** Staying on 15.x is not the same as staying still. This cycle moved
  15.5.22 → 15.5.25 within the pin, which is what cleared the critical Next.js RCE
  advisories (see below). Patch releases on the 15.5 line should be taken promptly
  rather than waiting on the major.

### typescript 5.9.3 → 7.0.2 — deferred (2026-09-17)

- **Current:** `^5.9.3`. **Available latest:** `7.0.2`.
- **Reason:** TypeScript 7 is the native port, and it breaks `next build` on
  Next 15.5.25. `tsc --noEmit` and the full unit suite both pass on 7.0.2, so the
  app's own types are fine — but Next loads `next.config.ts` through the TypeScript
  compiler API, and against 7.x that path throws:

  ```
  ⨯ Failed to load next.config.ts
  [TypeError: Cannot read properties of undefined (reading 'fileExists')]
  ```

  The build fails before compiling anything. Verified by reverting to 5.9.3 on an
  otherwise identical tree, where the build succeeds — so this is the TypeScript
  major, not anything else in this cycle.

- **Plan:** Revisit when Next.js supports the TypeScript 7 compiler API for
  `next.config.ts` loading. Tied to the Next 16 entry above: check both together,
  and re-test with `npm run build`, not just `npm run tsc` — a passing typecheck
  hides this failure entirely.

### @types/node 24.13.5 → 26.6.1 — deferred (2026-09-17)

- **Current:** `^24.13.3`. **Available latest:** `26.6.1`.
- **Reason:** `@types/node` majors track Node.js majors. This app runs Node 24 —
  `.nvmrc` pins 24.20.0, `package.json` `engines` requires `>=24.20.0 <25.0.0`,
  and CI resolves its Node from `.nvmrc`. Installing types for Node 26 against a
  Node 24 runtime would let the typechecker accept APIs that do not exist in
  production, which is worse than being a major behind.
- **Plan:** Bump in lockstep with the Node runtime, not on its own. When this app
  moves to Node 26, move `@types/node` with it in the same change.

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
  `@tailwindcss/postcss@4.3.3` resolves `postcss@8.5.28`, which is patched. The
  flagged copy is `postcss@8.4.31`, vendored inside `next@15.5.25` at
  `node_modules/next/node_modules/postcss`. We do not control that pin, and it is
  still present on 15.5.25, the latest 15.x release. The only fix `npm audit`
  offers is `next@16.3.5` — the deferred major (see
  [Deferred upgrades](#deferred-upgrades)).
- **Mitigation:** All four advisories require attacker-controlled CSS reaching
  the compiler: XSS via an unescaped `</style>` in stringify output, and three
  arbitrary-file-read paths via a malicious `sourceMappingURL` comment. This app
  compiles only first-party CSS at build time, in CI — no user-supplied
  stylesheet is ever parsed, at build time or at runtime. Exploitation would
  require an attacker to already have commit access to this repo, at which point
  the advisory is not the problem.
- **Revisit:** Clears with the Next 16 upgrade, or sooner if Next.js ships a 15.5.x
  patch bumping its bundled `postcss` past 8.5.22. Re-run `npm audit` on each
  dependency-update cycle and drop this entry once the nested copy is patched.
  This is the **only** remaining advisory in the tree; both counts `npm audit`
  reports (1 high, 1 moderate) trace to this one nested package.

<!-- Format:
### <advisory-id> — <package>@<version> (<severity>)

- **Reason it can't be fixed now:** ...
- **Mitigation:** ...
- **Revisit:** <condition or date>
-->
