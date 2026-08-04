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
runtime, which reads `.env.production`; an Amplify console variable alone is
build-time only and will not be visible to the route.

## Not yet set up

These are deliberate gaps, not oversights — see ADR 0001's open questions:

- **Auth.** No next-auth / Entra SSO yet; that is PAY-331. Until it lands,
  `hasDashboardSession` in `src/lib/session.ts` denies everyone, so
  `/api/transactions` returns 401. Fail-closed on purpose — the data behind it
  is live financial activity. That file documents the change PAY-331 makes.
- **Route protection.** No `middleware.ts`. Each protected route checks the
  session itself, which is opt-in per route and easy to forget. Worth adding
  once next-auth exists, as ADR 0001 specifies.
- **Test harness.** No test runner is configured. The backend uses Jest; that
  choice should be made when there is logic worth testing.
