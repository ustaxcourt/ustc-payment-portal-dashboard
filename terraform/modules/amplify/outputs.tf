output "app_id" {
  description = "Amplify app ID"
  value       = aws_amplify_app.this.id
}

output "default_domain" {
  description = "Amplify-provided domain, usable before the custom domain verifies"
  value       = aws_amplify_app.this.default_domain
}
