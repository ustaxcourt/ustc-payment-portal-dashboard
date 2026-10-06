# Summary
<!--
  Written by the dev. 2–5 sentences.
  Answer: what is being updated and why (routine rotation, security advisory, etc.)?
  Note anything intentionally held back and point to docs/dependency-caveats.md.
-->

## Dependencies Updated
<!--
  List the application areas a reviewer should exercise, then the package tables below.
  Remove rows or tables that do not apply (e.g. no Terraform provider changes).
-->

Affected application areas to exercise:

- [ ] login / session (next-auth, Entra)
- [ ] transaction log table (sorting, pagination, column rendering)
- [ ] search and filters (URL query state via nuqs)
- [ ] payment breakdown / totals (`/api/totals`, `/api/transactions`, SigV4-signed upstream calls)
- [ ] Excel export
- [ ] UI primitives and icons (dialogs, popovers, buttons)
- [ ] local dev (`npm run dev`) and production build (`npm run build`)

**Mandatory manual testing:** CI alone is not sufficient. Exercise the areas above locally.

### Runtime dependencies

| Package | Version | Purpose | Used in | Possible areas of testing |
|---|---:|---|---|---|
| `example-package` | 1.0.0 → 1.1.0 | What it does | Where it's used | What to exercise |

### Development dependencies

| Package | Version | Purpose | Used in |
|---|---:|---|---|
| `example-package` | 1.0.0 → 1.1.0 | What it does | Where it's used |

### Terraform providers

| Provider | Version | Purpose | Used in |
|---|---:|---|---|
| `hashicorp/aws` | 1.0.0 → 1.1.0 | AWS infrastructure | `terraform/bootstrap`, `terraform/environments/{dev,stg,prod}` |

### Dependencies checklist

- [ ] I have listed the updated packages, their purpose, where they're used, and the plain-language application areas to test.
- [ ] **Mandatory manual testing:** locally (`npm run dev`)
- [ ] I have confirmed that CI (lint, type check, unit tests, build) passes for this PR.
- [ ] I have run `npm audit --audit-level=high`; any remaining findings are recorded in `docs/dependency-caveats.md`.
- [ ] `package-lock.json` reflects a clean `npm ci` install — no hand edits.
- [ ] Terraform (if providers changed): lock files updated and `terraform plan` run in each affected root (`bootstrap`, `dev`, `stg`, `prod`). Delete this line if no Terraform changes.
- [ ] Deferred updates and accepted vulnerabilities are listed in `docs/dependency-caveats.md` (dates and latest versions refreshed).

---

## Testing
<!--
  Which of lint, type check, unit tests (vitest), build, e2e and accessibility (Playwright) were run.
  Note whether any test files changed; if not, say the existing suite passed unmodified.
-->

## Out of Scope / Follow-up Tickets
<!--
  Anything intentionally deferred (see docs/dependency-caveats.md).
  Format: "Short description — PAY-### (This looks wrong in VS Code markdown, but will format correctly to a checkbox in GitHub PR Summary)"
  Delete this section if there is nothing to note.

  IMPORTANT: Follow-up tickets need to exist in JIRA before they're listed here.
  Confirm with the team if a follow-up ticket should exist.
-->

- Short description - **PAY-###**
