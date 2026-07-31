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

## Not yet set up

These are deliberate gaps, not oversights — see ADR 0001's open questions:

- **Auth.** No next-auth / Entra SSO yet. The landing page is currently
  unauthenticated.
- **Hosting / Terraform.** Amplify vs OpenNext is undecided, and no
  infrastructure code exists in this repo yet.
- **Test harness.** No test runner is configured. The backend uses Jest; that
  choice should be made when there is logic worth testing.
