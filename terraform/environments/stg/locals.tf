locals {
  environment           = "stg"
  aws_region            = "us-east-1"
  account_id            = "747103385969"
  payment_portal_api_id = "q8qcerc843"

  state_bucket_name = "ustc-payment-portal-dashboard-terraform-state-stg"

  # Parent zone lives in the prod account; reaches this account by NS delegation.
  dashboard_domain = "stg-dashboard.payments.ustaxcourt.gov"
}
