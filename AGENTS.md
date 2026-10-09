# USTC Payment Portal Dashboard

**Instructions here should only be updated through `AGENTS.md`. `copilot-instructions.md` and `CLAUDE.md` are symlinks to `AGENTS.md`**

This is the USTC Payment Portal Dashboard. A Next.js App using TanStack Table to deliver auditable transaction records from USTC-Payment-Portal to the US Tax Court's Finance Team.

## Project Information

Stack: Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS v4 with shadcn-style components (Base UI), TanStack Table and React Query, `nuqs` for URL state, `next-auth` with Microsoft Entra ID, and `exceljs` for export. Biome handles linting, Vitest and Testing Library handle unit tests, and Playwright with axe handles e2e and accessibility. Node is pinned by `.nvmrc` (see `engines` in `package.json`).

Core constraints:

- The transaction table's timeframe, filtering, sorting, pagination and export must work together and stay coherent on every interaction. Treat any change to the transaction log as a risk to this property.
- Unauthenticated users must not be able to view any dashboard page. Access may later be restricted to a subset of the Court's users, not the whole tenant.

### Repo Structure

- [`src/app/`](src/app/): App Router routes, layout and global styles. Route handlers live in `api/` (`auth/[...nextauth]`, `totals`, `transactions`) and proxy the payment-portal backend.
- [`src/features/`](src/features/): one folder per dashboard feature, with components, hooks, pure logic and tests colocated.
  - `transaction-log/`: the table, filters, timeframe controls, column picker and Excel export (including the export web worker).
  - `revenue-totals/`: totals shown for the selected timeframe.
  - `payment-breakdown/`: per-payment breakdown section.
- [`src/components/ui/`](src/components/ui/): shared, feature-agnostic UI primitives.
- [`src/lib/`](src/lib/): shared non-UI code: auth config, the payment-portal API client (SigV4-signed), session helpers, formatting and the court calendar.
- [`src/providers/`](src/providers/): client-side providers and the idle-logout hook.
- [`src/middleware.ts`](src/middleware.ts): auth gate. Its `matcher` defines which routes are private, and API routes are excluded so they can return a JSON 401.
- [`e2e/`](e2e/): Playwright specs. File suffixes encode the project: `.anon.` and `.auth.` for anonymous and authenticated runs, and `.a11y.` for axe accessibility checks. `e2e/.auth`, `e2e/report` and `e2e/results` are gitignored output.
- [`biome-plugins/`](biome-plugins/): custom Biome (GritQL) lint rules. `no-hardcoded-colors.grit` forces Tailwind color tokens from `globals.css`.
- [`docs/`](docs/): ADRs in `architecture/decisions/`, accessibility baseline and testing guides, and `dependency-caveats.md` (deferred upgrades and accepted vulnerabilities, which must be updated when you defer one).
- [`scripts/entra-redirect-uris/`](scripts/entra-redirect-uris/): syncs per-branch Amplify preview URLs into the Entra app's redirect URIs (see ADR 0002). It is its own package with Vitest tests picked up by the root config.
- [`terraform/`](terraform/): `bootstrap/` (state bucket, applied once per account by a human), `modules/{amplify,iam}`, and one root per account in `environments/{dev,stg,prod}`. See [terraform/README.md](terraform/README.md).
- [`amplify.yml`](amplify.yml): AWS Amplify build spec. It derives `NEXTAUTH_URL` per branch and reads Entra secrets from SSM.
- [`.github/workflows/`](.github/workflows/): `ci.yml` (lint, typecheck, unit tests, build, with accessibility in parallel), `terraform-plan.yml` (fmt, validate, plan) and `entra-redirect-uris.yml` (redirect URI sync).

### Conventions

- Tests are colocated as `*.test.ts(x)` next to the source. The Vitest `@` alias maps to `src/`.
- Run `npm run lint`, `npm run tsc` and `npm test` before considering work done. CI runs the same checks, plus build and accessibility.
- Configuration for local development is in `.env.local` (copy from `.env.local.example`). Never commit secrets or edit `.env.local`.
- `AGENTS.md` is the source of truth for instructions. `CLAUDE.md` and `.github/copilot-instructions.md` are symlinks to it.

## Agent Expectations

- Campsite rule: you may notice that existing code violates some of the guidelines listed in these instructions. Limit incidental fixes to files you are already editing for the current task — do not open new files or start separate workstreams to address unrelated issues. Always leave those files better than you found them by applying established best practices and meeting test coverage objectives.
- **Be mindful of pagers!** Programs like `git`, `gh`, `aws`, `less`, etc. can freeze an interactive agent by waiting for keyboard input. ALWAYS ensure you pass `PAGER=cat` as an environment variable (e.g., `PAGER=cat git diff`), or use specific flags like `--no-pager`, to stream output properly.
- **Terminal buffer limitations!** The interactive shell has an input buffer character limit (often 1024 characters). Avoid using `cat << 'EOF' > ...`, `echo -e`, or `node -e "..."` to write large scripts or long strings directly via terminal injection. Exceeding the buffer limit will drop characters, mangle syntax, and trap the session in a broken `heredoc` sequence. Instead, ALWAYS use your agent's dedicated file-writing tools to construct or modify files larger than ~20 lines.
- Scratch files: feel free to write throwaway scripts, fixtures, and debug output to local files within the working tree. Clean these up before finishing or aborting a task — deleting scratch files you created is the one permitted exception to the `rm`/`rmdir` prohibition. Never leave temporary artifacts where they could be staged or committed by accident.
- Communication: when asking the developer questions, be concise but provide sufficient context to avoid back-and-forth. When providing instructions, be explicit and step-by-step to ensure clarity.
- Only execute read-only git commands, meaning commands that don't modify refs, the index, the working tree, or git config (e.g. `git status`, `git diff`, `git log`, `git show`, `git branch --list`, `git branch --show-current`). Never create, move, or delete refs (branches, tags, `HEAD`, stash) and never run `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git clean`, `git revert`, `git cherry-pick`, `git tag`, `git stash`, `git checkout`, `git switch`, `git restore`, or `git add`.
- You may remind the developer of the appropriate git commands, but never run them.
- The developer is responsible for reviewing and committing all code generated by the agent.
- Never execute destructive file operations like `rm`, `rmdir`, or `del`.
- Never use `sudo`, `chmod`, `chown`, `kill`, or `killall`.
- Never use `curl`, `wget`, or `eval`.
- Never read the contents of `.env.local`, instead read `.env.example` if you need to find env variable name.
- If a task requires any of these commands, provide the command for the developer to run manually.

### Project-specific Conventions

- **GitHub Actions `uses:` pinning**: before adding or editing a `uses:` line, search [`.github/workflows/`](.github/workflows/) for the same action (the name before the `@`) and pin to the version already used there — don't adopt a newer release, or default to the version you were trained on, just because one exists. Introduce a new version only deliberately; when you do, flag the now-out-of-sync workflows and ask the developer before updating them.

## Testing Conventions

- Do NOT write tests for functions that only return hardcoded constants or trivial passthroughs.

## Coverage Decisions

Before writing a new test or adding a coverage-ignore comment, use the following to determine the right path. Do not make this decision yourself without checking here first.

### Ambiguous cases — STOP and ask the developer before proceeding:

- Defensive `catch` blocks around code that is unlikely to throw in practice.
- Trivial passthroughs where it is unclear if the call site already has meaningful test coverage.
- Any case where you are unsure whether a test would catch a real bug.

When asking, use this format:

> "This code may not warrant a test — should I write one anyway, or add a coverage-ignore comment here? Here's why I'm asking: [reason]"

Do not proceed until the developer responds.
