# Accessibility baseline

Baseline run date: 2026-09-02

Tooling:

- Playwright
- `@axe-core/playwright` 4.13.0
- WCAG 2.1 Level A and AA axe tags (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`)

Pages scanned:

- `/login`
- `/`
- `/?range=last7&status=failed&sort=clientName&order=asc`
- `/` with the Transaction Log column picker open (added 2026-10-02, PAY-466)
- `/` with every Transaction Log column shown (added 2026-10-02, PAY-466)

Trivial fixes applied during the baseline audit:

- Darkened the shared `--muted-foreground` token to bring muted text on `--muted` above AA contrast.
- Darkened the shared `--primary` token and replaced the primary button hover alpha blend with an opaque color mix so filled buttons remain AA-compliant.

## Baseline findings

The initial axe scan identified color-contrast violations caused by the shared
`--muted-foreground` and `--primary` color tokens.

| Rule ID        | Impact  | Affected pages | Resolution                                                                              |
| -------------- | ------- | -------------- | --------------------------------------------------------------------------------------- |
| color-contrast | Serious | /login, /      | Darkened `--muted-foreground` and `--primary` tokens and adjusted button hover styling. |

## Final results

No automated WCAG 2.1 Level A or AA violations remained after the contrast fix.

| Page                                                    | Rule ID | Impact | Description                           | Recommended follow-up                                                                                          |
| ------------------------------------------------------- | ------- | ------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/login`                                                | None    | None   | No automated axe violations detected. | Keep the page in `npm run test:a11y` and manually review sign-in flows that cannot be automated through Entra. |
| `/`                                                     | None    | None   | No automated axe violations detected. | Keep using stubbed dashboard API responses so CI can scan the authenticated view deterministically.            |
| `/?range=last7&status=failed&sort=clientName&order=asc` | None    | None   | No automated axe violations detected. | Retain at least one filtered dashboard state in the suite so filtered results keep coverage.                   |
| `/`, column picker open                                 | None    | None   | No automated axe violations detected. | Rescan when the picker's design changes; it holds the only checkbox controls on the dashboard.                 |
| `/`, every column shown                                 | None    | None   | No automated axe violations detected. | Keep this state in the suite so newly added columns are scanned in the widest table layout.                    |

## Notes

This baseline is limited to automated axe checks. It does not replace manual testing for screen-reader behaviour, focus order during federated sign-in, or export-dialog interactions handled by the browser.
