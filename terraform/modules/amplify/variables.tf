variable "project_name" {
  description = "Project name used in resource names"
  type        = string
  default     = "ustc-payment-portal-dashboard"
}

variable "environment" {
  description = "Environment name (dev, stg, prod)"
  type        = string
}

variable "repository_url" {
  description = "HTTPS URL of the GitHub repository Amplify builds from"
  type        = string
  default     = "https://github.com/ustaxcourt/ustc-payment-portal-dashboard"
}

variable "production_branch" {
  description = "Branch served at the custom domain"
  type        = string
  default     = "main"
}

variable "preview_branch_patterns" {
  description = "Branches matching these globs get their own Amplify branch on amplifyapp.com, with no custom domain. Empty disables previews entirely."
  type        = list(string)
  default     = []
}

variable "dashboard_domain" {
  description = "Custom domain served by the production branch"
  type        = string
}
