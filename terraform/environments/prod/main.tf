module "iam" {
  source = "../../modules/iam"

  environment       = local.environment
  state_bucket_name = local.state_bucket_name
}

module "amplify" {
  source = "../../modules/amplify"

  environment      = local.environment
  dashboard_domain = local.dashboard_domain

  # No preview_branch_patterns: only the production branch builds here.
  api_invoke_arns = [
    "arn:aws:execute-api:${local.aws_region}:${local.account_id}:${local.payment_portal_api_id}/${local.environment}/GET/transaction-log",
  ]
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
