# Accessibility testing

The dashboard accessibility suite uses Playwright plus `@axe-core/playwright`
to scan fully rendered pages for WCAG 2.1 Level A and AA violations.

## Installation requirements

1. Run `npm ci` to install the JavaScript dependencies.
2. Install a Playwright browser. CI uses Chromium:

   ```bash
   npx playwright install chromium
   ```

3. Ensure auth variables are available for the authenticated dashboard scan.
   `e2e/auth.setup.ts` reads `NEXTAUTH_SECRET` from the environment first, then
   falls back to `.env.local`.
4. The accessibility specs stub `/api/totals` and `/api/transactions`, so they
   do not require a live payment-portal API.

## Running locally

Run the dedicated accessibility suite without the other Playwright specs:

```bash
npm run test:a11y
```

If Microsoft Edge is not installed locally, override the browser channel:

```bash
E2E_CHANNEL=chromium npm run test:a11y
```

## Interpreting violations

Each failure names the page in the test title and prints one line per axe rule,
including:

- the axe rule id
- the impact level
- the rule description
- up to three failing targets with axe's failure summary

When violations occur, the helper also attaches the full axe JSON payload to the
Playwright test result so the HTML report can be inspected in detail.

## Adding coverage for a new page

1. Create a new `*.a11y.anon.spec.ts` or `*.a11y.auth.spec.ts` file in `e2e/`.
2. Reuse `expectAccessiblePage` from `e2e/accessibility/axe.ts`.
3. Wait for the page's stable rendered state inside the `ready` callback before
   running axe.
4. If the page needs backend data, stub the dashboard-facing route in the spec
   or extend `e2e/accessibility/dashboardData.ts`.
5. Run `npm run test:a11y` and update `docs/accessibility-baseline.md` if the
   baseline findings change.
