module "iam" {
  source = "../../modules/iam"

  environment       = local.environment
  state_bucket_name = local.state_bucket_name
}

