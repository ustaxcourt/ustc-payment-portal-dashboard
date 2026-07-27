locals {
  environment = "prod"
  aws_region  = "us-east-1"
  account_id  = "802939326821"

  state_bucket_name = "ustc-payment-portal-dashboard-terraform-state-prod"

  # Parent zone is in this account but owned by the backend's state, so still delegated.
  dashboard_domain = "dashboard.payments.ustaxcourt.gov"
}
