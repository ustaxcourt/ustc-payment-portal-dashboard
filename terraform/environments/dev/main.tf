data "aws_caller_identity" "current" {}

# Guards against applying to the wrong account.
check "correct_account" {
  assert {
    condition = data.aws_caller_identity.current.account_id == local.account_id
    error_message = format(
      "Wrong AWS account: credentials are for %s but this root targets %s (%s).",
      data.aws_caller_identity.current.account_id,
      local.account_id,
      local.environment,
    )
  }
}

module "iam" {
  source = "../../modules/iam"

  environment       = local.environment
  aws_region        = local.aws_region
  state_bucket_name = local.state_bucket_name
}

# Resolves only once payments.ustaxcourt.gov delegates to these nameservers.
resource "aws_route53_zone" "dashboard" {
  name          = local.dashboard_domain
  comment       = "Dashboard zone for ${local.environment}; delegated from payments.ustaxcourt.gov"
  force_destroy = false

  tags = {
    Name = local.dashboard_domain
  }
}

