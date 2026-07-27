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

variable "state_bucket_name" {
  description = "Terraform state bucket in this account"
  type        = string
}
