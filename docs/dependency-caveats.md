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

_None yet._

<!-- Format:
### <package> <current> → <available> — deferred (<date>)

- **Current:** `<version/range>`. **Available latest:** `<version>`.
- **Reason:** ...
- **Plan:** ... (link a follow-up ticket if one is cut; flag the PO if pursued)
-->

---

## Accepted vulnerabilities

### GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 — postcss@8.4.31 (high)

- **Reason it can't be fixed now:** These advisories cover `postcss <= 8.5.17`.
  Our direct dependency tree is already clear — `@tailwindcss/postcss@4.3.3`
  resolves `postcss@8.5.23`, which is patched. The flagged copy is
  `postcss@8.4.31`, vendored inside `next@16.2.12` at
  `node_modules/next/node_modules/postcss`. We do not control that pin, and
  `npm audit fix --force` "resolves" it by installing `next@9.3.3` — a downgrade
  across seven major versions that would delete the App Router this app is built
  on. Not an option.
- **Mitigation:** All three advisories require attacker-controlled CSS reaching
  the compiler: XSS via an unescaped `</style>` in stringify output, and two
  arbitrary-file-read paths via a malicious `sourceMappingURL` comment. This app
  compiles only first-party CSS at build time, in CI — no user-supplied
  stylesheet is ever parsed, at build time or at runtime. Exploitation would
  require an attacker to already have commit access to this repo, at which point
  the advisory is not the problem.
- **Revisit:** When Next.js ships a release bumping its bundled `postcss` past
  8.5.17. Re-run `npm audit` on each dependency-update cycle and drop this entry
  once the nested copy is patched.

### GHSA-f88m-g3jw-g9cj — sharp@0.34.5 (high)

- **Reason it can't be fixed now:** `sharp < 0.35.0` inherits libvips
  vulnerabilities CVE-2026-33327, CVE-2026-33328, CVE-2026-35590 and
  CVE-2026-35591. `sharp` is not a direct dependency — it arrives transitively
  through `next@16.2.12`, which pins it for `next/image` optimization. As above,
  the only fix `npm audit` offers is the `next@9.3.3` downgrade.
- **Mitigation:** The vulnerabilities are in libvips image decoding, reachable
  only by passing untrusted image bytes through `sharp`. This app currently has
  no image pipeline at all: the placeholder landing page renders text only, uses
  no `next/image`, and `public/` contains no images. There is no code path that
  hands an attacker-supplied image to `sharp`. This mitigation is scoped to the
  current placeholder — **re-evaluate before adding any user-supplied image
  upload or remote image optimization.**
- **Revisit:** When Next.js bumps its bundled `sharp` to `>= 0.35.0`, or sooner
  if an image pipeline is introduced.

<!-- Format:
### <advisory-id> — <package>@<version> (<severity>)

- **Reason it can't be fixed now:** ...
- **Mitigation:** ...
- **Revisit:** <condition or date>
-->
