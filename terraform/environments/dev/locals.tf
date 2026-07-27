locals {
  environment = "dev"
  aws_region  = "us-east-1"
  account_id  = "723609007960"

  state_bucket_name = "ustc-payment-portal-dashboard-terraform-state-dev"

  # Parent zone lives in the prod account; reaches this account by NS delegation.
  dashboard_domain = "dev-dashboard.payments.ustaxcourt.gov"
}
