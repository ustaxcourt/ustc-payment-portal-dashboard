# Terraform

Infrastructure for the Case Services & Finance dashboards. Layout mirrors
`ustc-payment-portal` so that anyone who works on the backend can read it.

```
terraform/
  bootstrap/            # State bucket. Run once per account, by a human.
  modules/iam/          # GitHub Actions OIDC roles.
  environments/dev/     # One root per account.
  environments/stg/
  environments/prod/
```

## Accounts

| Environment | Account | State bucket | Domain |
| --- | --- | --- | --- |
| dev | 723609007960 | `ustc-payment-portal-dashboard-terraform-state-dev` | `dev-dashboard.payments.ustaxcourt.gov` |
| stg | 747103385969 | `ustc-payment-portal-dashboard-terraform-state-stg` | `stg-dashboard.payments.ustaxcourt.gov` |
| prod | 802939326821 | `ustc-payment-portal-dashboard-terraform-state-prod` | `dashboard.payments.ustaxcourt.gov` |

Every root pins `allowed_account_ids` on its AWS provider, so a plan or apply
against the wrong account errors out before the provider makes a single API
call.

## First-time setup, per account

Bootstrap creates the state bucket that every other root depends on, so it runs
with local state and must be applied by a human with SSO credentials — CI cannot
do it, because the role CI would assume does not exist yet.

Export `AWS_PROFILE` for the whole session rather than prefixing individual
commands — `terraform init` needs credentials too, because it reaches the S3
backend.

```bash
export AWS_PROFILE=ent-apps-payment-portal-workloads-dev
aws sso login                       # opens a browser
aws sts get-caller-identity         # expect Account 723609007960

cd terraform/bootstrap
terraform init
terraform apply -var-file=dev.tfvars
```

Repeat with `stg.tfvars` / `prod.tfvars` against the matching profile. Do not
commit the local `terraform.tfstate` bootstrap produces; the bucket it creates is
the only durable artifact, and re-running is idempotent.

Then apply the environment root to create the CI roles:

```bash
cd ../environments/dev
terraform init -backend-config=backend.hcl
terraform plan                      # review before applying
terraform apply
```

If `init` fails with "No valid credential sources found", `AWS_PROFILE` is not
set in the shell — the S3 backend needs it at init time, not just at apply time.
Re-run with `-reconfigure` after fixing it.

Take `read_only_role_arn` and `deploy_role_arn` from the outputs and set them as
GitHub repository secrets:

| Secret | Value |
| --- | --- |
| `DEV_AWS_READ_ONLY_ROLE_ARN` | dev `read_only_role_arn` |
| `STG_AWS_READ_ONLY_ROLE_ARN` | stg `read_only_role_arn` |
| `PROD_AWS_READ_ONLY_ROLE_ARN` | prod `read_only_role_arn` |

Until those secrets exist, `terraform-plan.yml` runs format and validate and
skips the plan step with a notice rather than failing.

## Day-to-day

```bash
export AWS_PROFILE=ent-apps-payment-portal-workloads-dev
terraform fmt -recursive          # CI enforces this
cd environments/dev
terraform init -backend-config=backend.hcl
terraform plan
```

## Hosting

Amplify hosts the dashboard. `modules/amplify` creates the app, its service role,
the production branch, and the domain association; `aws_amplify_domain_association`
requests the ACM certificate and writes both the validation record and the ALIAS
into that environment's hosted zone. That only works because each account owns the
zone for its own hostname, reached by NS delegation from `payments.ustaxcourt.gov`
in the prod account.

Connecting the repo is a manual step, once per account: Amplify holds the GitHub
credential, not Terraform. Create the app in the Amplify console with the repository
attached, then `terraform import module.amplify.aws_amplify_app.this <app-id>`. An
app created without a repository is a manual-deploy app and can never be connected
to Git afterwards.

Treat `aws_amplify_app` as unreplaceable. Terraform cannot recreate the repo
connection, so any plan showing `must be replaced` on it needs investigating rather
than applying — `enable_performance_mode` is one attribute known to force it.

## State

| Environment | Bootstrap | CI roles | Zone + delegation | Amplify + domain |
| --- | --- | --- | --- | --- |
| dev | done | done | done | done |
| stg | not started | not started | not started | not started |
| prod | not started | not started | not started | not started |

Preview branches are dev-only. Staging and production pass no
`preview_branch_patterns`, so they build their production branch alone.

The deployer role is still scoped to state access plus reads. Its write permissions
are written alongside the resources they grant access to, not guessed at in advance,
so applies are run by a human until that is settled.
