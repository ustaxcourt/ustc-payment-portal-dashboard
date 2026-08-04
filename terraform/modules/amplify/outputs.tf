output "app_id" {
  description = "Amplify app ID"
  value       = aws_amplify_app.payment_portal_dashboard.id
}

output "default_domain" {
  description = "Amplify-provided domain, usable before the custom domain verifies"
  value       = aws_amplify_app.payment_portal_dashboard.default_domain
}

output "compute_role_arn" {
  description = "SSR compute role, granted execute-api:Invoke by the payment-portal API"
  value       = aws_iam_role.amplify_compute.arn
}
