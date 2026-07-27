output "deploy_role_arn" {
  description = "ARN of the GitHub Actions deployer role; set as the per-environment deploy role secret"
  value       = aws_iam_role.github_actions_deployer.arn
}

output "read_only_role_arn" {
  description = "ARN of the GitHub Actions read-only role; set as the per-environment plan role secret"
  value       = aws_iam_role.github_actions_read_only.arn
}
