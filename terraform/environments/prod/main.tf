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

# Hosting, DNS and certificates land in a follow-up (PAY-330).
