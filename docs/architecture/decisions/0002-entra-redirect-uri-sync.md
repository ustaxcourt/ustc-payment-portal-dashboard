# 2. Entra redirect URIs managed from this repo

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

That workflow signs in with a broadly privileged identity, so it was not
suitable to trigger from this repo on every pull request. It also left the
app's few permanent URIs (the dev domain, local development) as unreviewed
manual edits.

## Decision

A scheduled, event-assisted **sync job** in this repo owns the app's entire
redirect URI list: the permanent URIs declared in code, plus one per preview
branch.

| Concern | Choice |
| --- | --- |
| What gets a URI | Every branch matching Amplify's `preview_branch_patterns`, PR or not |
| When a URI goes away | When its branch is deleted; auto-delete on merge makes that automatic |
| Model | **Reconcile**: compute the full desired set every run, not add/remove per event |
| Scope | The whole list: `STATIC_REDIRECT_URIS` in `plan.ts` plus preview URIs; anything else is removed |
| Identity | Dedicated app **Payment Portal Dashboard Preview Sync**: federated credential for the `entra-dev` environment, no secrets, Graph `Application.ReadWrite.OwnedBy`, owner of the dev app only |
| Triggers | `pull_request_target` (opened/reopened), `delete`, `schedule` every 15 min, `workflow_dispatch` |
| Guard rails | `entra-dev` deployable from `main` only; `DRY_RUN` variable; removal cap (default 10); 256-URI limit; read-back verification after each write |

Code: `scripts/entra-redirect-uris/` (`plan.ts` decides, `sync.sh` fetches
and writes) and `.github/workflows/entra-redirect-uris.yml`.

**Reconcile instead of add/remove events.** GitHub keeps at most one pending
run per concurrency group and drops the rest, and scheduled runs can be
skipped. An event-driven job would lose URIs silently; a reconciler repairs
any missed event on its next run and is safe to run any number of times.

**Own the whole list, declared in code.** Adding a permanent URI is a PR to
`STATIC_REDIRECT_URIS`, so every change is reviewed, and edits made in the
Azure portal are reverted rather than drifting. This also retires the manual
workflow in `isd-cloud-payment-portal`.

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

**Manage only preview URIs; keep the isd workflow for the rest.** The first
version of this design. Leaves two tools editing one list, one of them manual
and unreviewed.

**Reuse the isd repo's service principal.** Works, but grants far more access
than editing one app's redirect URIs to a job that runs on every pull request.

**A single redirect URI plus a proxy** (Auth.js v5 `redirectProxyUrl`).
Removes per-preview URIs entirely, but requires migrating off next-auth v4.
Kept as a follow-up.

## Consequences

- Pushing a matching branch gives its preview working sign-in within about
  15 minutes (immediately when a PR is opened); merging removes it.
- A branch that is closed without merging, or never gets a PR, keeps a working
  sign-in until the branch is deleted. Stale-branch cleanup is a separate
  concern; branches outside the preview patterns get no preview at all.
- Any URI that is not in `STATIC_REDIRECT_URIS` and has no branch is removed,
  including ones added by hand in the Azure portal. A wrong edit to
  `STATIC_REDIRECT_URIS` (dropping the dev domain, say) would break dev
  sign-in on the next run, so review it like any auth change.
- Each run appears as a deployment on the `entra-dev` environment.
- GitHub pauses scheduled workflows in public repos after 60 days without a
  commit; event triggers still run, and the schedule is re-enabled from the
  Actions tab.

## References

- `scripts/entra-redirect-uris/`, `.github/workflows/entra-redirect-uris.yml`
- `terraform/environments/dev/main.tf` (`preview_branch_patterns`), `amplify.yml`
- [Graph `Application.ReadWrite.OwnedBy`](https://learn.microsoft.com/en-us/graph/permissions-reference#applicationreadwriteownedby)
