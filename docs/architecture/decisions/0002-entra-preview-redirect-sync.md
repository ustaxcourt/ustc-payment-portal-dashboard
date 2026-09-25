# 2. Automatic Entra redirect URIs for Amplify preview branches

Date: 2026-09-25

## Status

Accepted (2026-09-25)

> Implemented in PAY-459. The Product Owner chose to mirror Amplify's branch
> lifecycle (below) over tying URIs to open pull requests.

## Context

Amplify builds a preview of every `PAY-*` and `feature/*` branch on its own
subdomain (`https://<branch>.<app-id>.amplifyapp.com`). Entra only returns a
user to a redirect URI registered on the app, so each preview's
`/api/auth/callback/azure-ad` URI must be on **Payment Portal Dashboard Dev**
before anyone can sign in to it.

Until now, developers added these by hand through a manual workflow in
`isd-cloud-payment-portal`, and nothing removed them. By September 2026 the app
held 16 URIs for previews that no longer existed, plus several placeholders.

That workflow signs in as a service principal with `Application.ReadWrite.All`,
which can edit every app registration in the tenant, so it was not a suitable
identity to trigger from this repo on every pull request.

## Decision

A scheduled, event-assisted **sync job** in this repo makes the app's preview
URIs match the repo's branches.

| Concern | Choice |
| --- | --- |
| What gets a URI | Every branch matching Amplify's `preview_branch_patterns`, PR or not |
| When a URI goes away | When its branch is deleted; auto-delete on merge makes that automatic |
| Model | **Reconcile**: compute the full desired set every run, not add/remove per event |
| Scope | Only URIs matching `https://<sub>.<app-id>.amplifyapp.com/api/auth/callback/azure-ad`; all others are never touched |
| Identity | Dedicated app **Payment Portal Dashboard Preview Sync**: federated credential for the `entra-dev` environment, no secrets, Graph `Application.ReadWrite.OwnedBy`, owner of the dev app only |
| Triggers | `pull_request_target` (opened/reopened), `delete`, `schedule` every 15 min, `workflow_dispatch` |
| Guard rails | `entra-dev` deployable from `main` only; `DRY_RUN` variable; removal cap (default 10); 256-URI limit; read-back verification after each write |

Code: `scripts/entra-preview-redirects/` (`plan.ts` decides, `sync.sh` fetches
and writes) and `.github/workflows/entra-preview-redirects.yml`.

**Reconcile instead of add/remove events.** GitHub keeps at most one pending
run per concurrency group and drops the rest, and scheduled runs can be
skipped. An event-driven job would lose URIs silently; a reconciler repairs
any missed event on its next run and is safe to run any number of times.

**Only triggers that run from `main`.** The environment is restricted to
`main`, so a branch cannot edit the script and then run it against Entra.
`create` and `push` run the workflow from the pushed branch, so they are not
used; the 15-minute schedule covers newly pushed branches instead.
`pull_request_target` is safe here because the job never checks out PR code.

**The subdomain rule is duplicated on purpose.** `plan.ts` repeats
`amplify.yml`'s `NEXTAUTH_URL` rule (lowercase, non-alphanumerics to `-`)
because that is the `redirect_uri` the app actually sends. A test pins it,
and both places point at each other.

### Alternatives considered

**Tie URIs to open pull requests.** Matches the original ticket wording and
limits how long a preview can be logged into. Rejected by the Product Owner
because previews exist from the first push, so developers testing before
opening a PR would lose sign-in.

**Wildcard redirect URIs.** Entra does not support wildcards for apps that
sign in work or school accounts, and Microsoft advises against them because
they let any matching host receive authorization codes.

**Manage the app registration with the `azuread` Terraform provider.** Would
need an identity that can write the app from Terraform runs and would put the
whole registration, not just preview URIs, under per-PR churn.

**Reuse the isd repo's service principal.** Works, but grants tenant-wide app
registration write to a job that runs on every pull request.

**A single redirect URI plus a proxy** (Auth.js v5 `redirectProxyUrl`).
Removes per-preview URIs entirely, but requires migrating off next-auth v4.
Kept as a follow-up.

## Consequences

- Pushing a matching branch gives its preview working sign-in within about
  15 minutes (immediately when a PR is opened); merging removes it.
- A branch that is closed without merging, or never gets a PR, keeps a working
  sign-in until the branch is deleted. Stale-branch cleanup is a separate
  concern; branches outside the preview patterns get no preview at all.
- Any URI of the owned form that does not match a branch is removed, including
  ones added by hand. The isd workflow is now for non-preview URIs only.
- Each run appears as a deployment on the `entra-dev` environment.
- GitHub pauses scheduled workflows in public repos after 60 days without a
  commit; event triggers still run, and the schedule is re-enabled from the
  Actions tab.

## References

- `scripts/entra-preview-redirects/`, `.github/workflows/entra-preview-redirects.yml`
- `terraform/environments/dev/main.tf` (`preview_branch_patterns`), `amplify.yml`
- `ustaxcourt/isd-cloud-payment-portal` (manual workflow for non-preview URIs)
- [Graph `Application.ReadWrite.OwnedBy`](https://learn.microsoft.com/en-us/graph/permissions-reference#applicationreadwriteownedby)
