variable "project_name" {
  description = "Project name used in role and policy names"
  type        = string
  default     = "ustc-payment-portal-dashboard"
}

variable "environment" {
  description = "Environment name (dev, stg, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "github_org" {
  description = "GitHub organization that owns the repository"
  type        = string
  default     = "ustaxcourt"
}

variable "github_repo" {
  description = "GitHub repository allowed to assume these roles"
  type        = string
  default     = "ustc-payment-portal-dashboard"
}

# OIDC sub embeds these: repo:<org>@<org_id>/<repo>@<repo_id>:<event>
variable "github_org_id" {
  description = "Numeric GitHub organization ID (gh api orgs/<org> --jq .id)"
  type        = string
  default     = "40034127"
}

variable "github_repo_id" {
  description = "Numeric GitHub repository ID (gh api repos/<org>/<repo> --jq .id)"
  type        = string
  default     = "1311097674"
}

variable "state_bucket_name" {
  description = "Terraform state bucket in this account"
  type        = string
}
