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

| Environment | Account | State bucket | Domain (PAY-330) |
| --- | --- | --- | --- |
| dev | 723609007960 | `ustc-payment-portal-dashboard-terraform-state-dev` | `dev-dashboard.payments.ustaxcourt.gov` |
| stg | 747103385969 | `ustc-payment-portal-dashboard-terraform-state-stg` | `stg-dashboard.payments.ustaxcourt.gov` |
| prod | 802939326821 | `ustc-payment-portal-dashboard-terraform-state-prod` | `dashboard.payments.ustaxcourt.gov` |

Every root asserts the account it is running against and fails before creating
anything if the credentials point somewhere else.

## First-time setup, per account

Bootstrap creates the state bucket that every other root depends on, so it runs
with local state and must be applied by a human with SSO credentials — CI cannot
do it, because the role CI would assume does not exist yet.

```bash
aws sso login --profile ent-apps-payment-portal-workloads-dev

cd terraform/bootstrap
terraform init
AWS_PROFILE=ent-apps-payment-portal-workloads-dev \
  terraform apply -var-file=dev.tfvars
```

Repeat with `stg.tfvars` / `prod.tfvars` against the matching profile. Do not
commit the local `terraform.tfstate` bootstrap produces; the bucket it creates is
the only durable artifact, and re-running is idempotent.

Then apply the environment root to create the CI roles:

```bash
cd ../environments/dev
terraform init -backend-config=backend.hcl
AWS_PROFILE=ent-apps-payment-portal-workloads-dev terraform apply
```

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
terraform fmt -recursive          # CI enforces this
cd environments/dev
terraform init -backend-config=backend.hcl
terraform plan
```

## Not built yet

Hosting, DNS and certificates are not built yet, pending the hosting decision in
ADR 0001 (open question 3). The deployer role is deliberately scoped to state
access plus reads until then — its write permissions are written alongside the
resources they grant access to, not guessed at in advance.

See PAY-330.
