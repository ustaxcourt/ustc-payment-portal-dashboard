# ustc-payment-portal-dashboard

Case Services & Finance dashboards for the USTC payment portal (epic PAY-268).

Stack decisions are recorded in
[ADR 0001](docs/architecture/decisions/0001-dashboard-technology-stack.md).

## Requirements

- Node `24.20.0` (see `.nvmrc`)

## Getting started

```bash
nvm use
npm ci
npm run dev
```

The app runs at http://localhost:3000.

## Scripts

| Script              | Purpose                            |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Local dev server                   |
| `npm run build`     | Production build                   |
| `npm run start`     | Serve a production build           |
| `npm run lint`      | Biome lint                         |
| `npm run tsc`       | Type check (no emit)               |
| `npm run test`      | Vitest unit tests                  |
| `npm run test:a11y` | Playwright axe accessibility suite |

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Biome for linting (matching `ustc-payment-portal`)

## Local development

The dashboard needs a payment-portal API to talk to, and a signed-in Court user.

```bash
cp .env.local.example .env.local
```

Fill in the four Entra values from SSM, then choose what to point at:

**Local payment portal** — run `npm run start:portal` in `ustc-payment-portal`
first. The placeholder `AWS_*` values in the example file are enough, because
the local dev server never verifies the SigV4 signature.

**A deployed environment** — set `PAYMENT_PORTAL_API_URL` to that stage's API
Gateway URL and **delete the three `AWS_*` lines**, so the signer uses your own
credentials from `aws sso login`. Placeholder keys are rejected by real API
Gateway.

```bash
npm run dev
```

Then sign in at http://localhost:3000. Note `npm run build` and `npm run dev`
share `.next`, so running a build while the dev server is up will break it.

Accessibility test setup and workflow notes live in
[docs/accessibility-testing.md](docs/accessibility-testing.md).

The dashboard requests the Microsoft refresh-token scope (`offline_access`) and
refreshes Entra access tokens server-side inside the NextAuth JWT callback.
Make sure the app registration and tenant policy allow issuing refresh tokens
for the delegated scopes `openid profile offline_access User.Read`; if refresh
fails because the token was revoked or expired, the dashboard clears the
session on the next auth check and sends the user back through the normal
sign-in flow.

## Talking to the payment portal

The browser never calls the payment-portal API. `/api/transactions` runs on the
server, checks the Court session, then signs a SigV4 request to the API's
`/transaction-log` endpoint as the Amplify compute role. The API authorises on
IAM, so neither the session nor the AWS credential reaches the client.

| Variable                 | Purpose                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `PAYMENT_PORTAL_API_URL` | Base URL of the payment-portal API, e.g. `https://<api-id>.execute-api.us-east-1.amazonaws.com/dev` |

Amplify supplies the AWS credentials itself through the app's compute role — no
keys are configured anywhere. `PAYMENT_PORTAL_API_URL` must reach the **server**
runtime, which reads `.env.production`; a console variable alone is build-time
only. `amplify.yml` writes it there, and fails the build if it is unset.

Set it as a plain Amplify environment variable (not a secret — it is a public
URL) per environment.

## Exporting transactions

The Export button saves the **complete** current view — every row matching
the applied timeframe, status tab, and sort, not just the 200 the table shows —
as an `.xlsx` workbook named for the data's date range (for example
`2026-08-01 to 2026-08-17 - USTC Fee Payment Summary (Failed).xlsx`).
In Edge/Chrome a save-as dialog opens first (File System Access API) so the
user picks the destination; elsewhere, or if the dialog is blocked, it falls
back to a standard browser download. Cancelling the dialog abandons the
export before any data is fetched.

How it works, and where the pieces live (all under
`src/features/transaction-log/`):

- `exportTransactions.ts` fetches up to 5 pages concurrently at
  `pageSize=5000` (`export=true` unlocks that ceiling server-side), refuses
  views over `EXPORT_ROW_LIMIT` (50k), and — because offset pages are not a
  consistent snapshot — verifies the assembled row count against page 1's
  `total`, refetching once on a mismatch.
- `workbookBuilder.ts` + `exportWorkbook.worker.ts` build the workbook off the
  main thread so a 50k-row file cannot freeze the tab. Cells are typed:
  amounts are real numbers with a currency format, timestamps split into
  Eastern-time date and time cells. exceljs stays out of the page bundle; it
  loads only inside the worker chunk.
- `exportColumns.ts` derives the columns from the same source of truth as the
  table, so the file always matches the on-screen column set (including the
  tab-dependent Failure reason column).

## Entra redirect URIs

The **Entra Redirect URIs** workflow owns the Payment Portal Dashboard Dev app
registration's redirect URI list. It keeps exactly:

- the permanent URIs in `STATIC_REDIRECT_URIS`
  (`scripts/entra-redirect-uris/plan.ts`): local development and the dev
  domain, and
- one sign-in callback per `PAY-*` or `feature/*` branch, matching its Amplify
  preview.

Push a branch and sign-in works on its preview within about 15 minutes
(immediately if you open a PR); delete or merge the branch and the callback is
removed. To add a permanent URI, add it to `STATIC_REDIRECT_URIS` in a PR.
Anything else, including URIs added in the Azure portal, is removed on the next
run. See ADR 0002 for why it works this way.

The workflow runs `scripts/entra-redirect-uris/sync.sh`, which compares that
list with the app's redirect URIs, reports the difference on the run's summary
page, and applies it.

Configuration lives in the `entra-dev` GitHub environment (deployable from
`main` only): secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`,
`ENTRA_APP_OBJECT_ID`, and variables `AMPLIFY_APP_ID` and `DRY_RUN`.

- **Pause it:** set `DRY_RUN` to `true`. Runs keep reporting but change nothing.
  `false` turns writes back on.
- **Run it now:** Actions → Entra Redirect URIs → Run workflow.
- **"Refusing to remove N URIs":** a run will not remove more than 10 at once,
  in case the branch list came back wrong. Check the summary; if the removals
  are expected, run it manually with a higher `max_removals`.
- **"Entra does not match the plan":** the write did not stick. Compare the
  app's redirect URIs in the Azure portal with the run summary, then re-run.
- **Preview sign-in fails with `AADSTS50011`:** the callback is not registered
  yet. Check the latest run, or run it manually.
- **Scheduled runs stopped:** GitHub pauses schedules after 60 days without a
  commit. Re-enable the workflow from the Actions tab.

To see what a run would do without GitHub Actions (read-only with
`DRY_RUN=true`, using your own `az login`):

```sh
GITHUB_REPOSITORY=ustaxcourt/ustc-payment-portal-dashboard \
ENTRA_APP_OBJECT_ID=<object id> AMPLIFY_APP_ID=<app id> \
scripts/entra-redirect-uris/sync.sh
```

## Not yet set up

These are deliberate gaps, not oversights — see ADR 0001's open questions:

- **Access is tenant-wide.** Entra sign-in works, but the app requests only
  `openid profile User.Read` and checks no group or role claim, so any user in
  the Court's Microsoft tenant can sign in and read live financial data.
  ADR 0001 calls for restricting to a subset of users.
- **Route coverage.** Vitest and Playwright are set up, but the auth guard and
  parameter whitelist in `/api/transactions` still have no direct coverage.
- **No paging controls.** The table shows the first 200 rows of the current
  view; the footer reports the true total and points at the export, which is
  the sanctioned path to the complete set. If users ever need deeper on-screen
  browsing, a load-more control is purely additive — the API already pages.
