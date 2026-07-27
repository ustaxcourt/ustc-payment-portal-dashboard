output "deploy_role_arn" {
  description = "GitHub Actions deployer role ARN for this environment"
  value       = module.iam.deploy_role_arn
}

output "read_only_role_arn" {
  description = "GitHub Actions read-only role ARN for this environment"
  value       = module.iam.read_only_role_arn
}

output "dashboard_domain" {
  description = "Custom domain this environment's dashboard will be served at"
  value       = local.dashboard_domain
}
