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

output "dashboard_zone_id" {
  description = "Route53 hosted zone ID for the dashboard domain"
  value       = aws_route53_zone.dashboard.zone_id
}

output "dashboard_zone_name_servers" {
  description = "Give these to the owner of payments.ustaxcourt.gov to create the NS delegation record"
  value       = aws_route53_zone.dashboard.name_servers
}
