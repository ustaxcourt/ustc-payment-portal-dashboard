# ustc-payment-portal-dashboard

Case Services & Finance dashboards for the USTC payment portal (epic PAY-268).

Stack decisions are recorded in
[ADR 0001](docs/architecture/decisions/0001-dashboard-technology-stack.md).

## Requirements

- Node `24.18.0` (see `.nvmrc`)

## Getting started

```bash
nvm use
npm ci
npm run dev
```

The app runs at http://localhost:3000.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Serve a production build |
| `npm run lint` | Biome lint |
| `npm run tsc` | Type check (no emit) |

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

## Talking to the payment portal

The browser never calls the payment-portal API. `/api/transactions` runs on the
server, checks the Court session, then signs a SigV4 request to the API's
`/transaction-log` endpoint as the Amplify compute role. The API authorises on
IAM, so neither the session nor the AWS credential reaches the client.

| Variable | Purpose |
| --- | --- |
| `PAYMENT_PORTAL_API_URL` | Base URL of the payment-portal API, e.g. `https://<api-id>.execute-api.us-east-1.amazonaws.com/dev` |

Amplify supplies the AWS credentials itself through the app's compute role — no
keys are configured anywhere. `PAYMENT_PORTAL_API_URL` must reach the **server**
runtime, which reads `.env.production`; a console variable alone is build-time
only. `amplify.yml` writes it there, and fails the build if it is unset.

Set it as a plain Amplify environment variable (not a secret — it is a public
URL) per environment.

## Not yet set up

These are deliberate gaps, not oversights — see ADR 0001's open questions:

- **Access is tenant-wide.** Entra sign-in works, but the app requests only
  `openid profile User.Read` and checks no group or role claim, so any user in
  the Court's Microsoft tenant can sign in and read live financial data.
  ADR 0001 calls for restricting to a subset of users.
- **Test harness.** No test runner is configured. The backend uses Jest, and
  `next/jest` handles the App Router config when it is added. The auth guard and
  parameter whitelist in `/api/transactions` have no coverage.
- **No paging controls.** The log fetches every transaction for the day across
  as many API pages as it takes. That is bounded by a single Court day; a
  future date-range picker would need real pagination, since ADR 0001 rejects
  pulling unbounded history into the browser.
