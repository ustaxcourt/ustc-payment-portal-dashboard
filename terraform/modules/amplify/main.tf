data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  name = "${var.project_name}-${var.environment}"
}

# SSR apps need a service role; without one the compute never starts and
# requests fall through to static and 404.
resource "aws_iam_role" "amplify" {
  name = "${local.name}-amplify-service"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Action    = "sts:AssumeRole"
        Principal = { Service = "amplify.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy" "amplify_logs" {
  name = "${local.name}-amplify-logs"
  role = aws_iam_role.amplify.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # DescribeLogGroups does not support resource-level permissions.
        Effect   = "Allow"
        Action   = ["logs:DescribeLogGroups"]
        Resource = "*"
      },
      {
        # The trailing :* covers the log streams inside each group.
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/amplify/*:*"
      },
    ]
  })
}

resource "aws_iam_role_policy" "amplify_ssm" {
  name = "${local.name}-amplify-ssm"
  role = aws_iam_role.amplify.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
        ]
        Resource = [
          "arn:aws:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter/amplify/${aws_amplify_app.payment_portal_dashboard.id}/*",
          "arn:aws:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter/amplify/shared/${aws_amplify_app.payment_portal_dashboard.id}/*",
        ]
      },
      {
        # SecureString values use the aws/ssm managed key; scope to SSM only.
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${data.aws_region.current.region}.amazonaws.com"
          }
        }
      },
    ]
  })
}

# The repo connection is made once in the Amplify console and then imported here;
# Terraform holds no GitHub credential. An app created without `repository` is a
# manual-deploy app and can never be connected to Git afterwards.
resource "aws_amplify_app" "payment_portal_dashboard" {
  name                 = local.name
  repository           = var.repository_url
  platform             = "WEB_COMPUTE"
  iam_service_role_arn = aws_iam_role.amplify.arn

  enable_branch_auto_build = true

  # Preview branches are opt-in per environment; stg and prod pass an empty list
  # so only their production branch ever builds. Auto-deletion removes the Amplify
  # branch when the git branch goes, so stale previews cannot accumulate.
  enable_auto_branch_creation   = length(var.preview_branch_patterns) > 0
  enable_branch_auto_deletion   = length(var.preview_branch_patterns) > 0
  auto_branch_creation_patterns = var.preview_branch_patterns

  # enable_performance_mode is deliberately omitted — it is ForceNew, and
  # replacing this app would destroy the repo connection Terraform cannot rebuild.
  dynamic "auto_branch_creation_config" {
    for_each = length(var.preview_branch_patterns) > 0 ? [1] : []

    content {
      enable_auto_build           = true
      framework                   = "Next.js - SSR"
      stage                       = "DEVELOPMENT"
      enable_pull_request_preview = false
    }
  }

  # Build settings live in amplify.yml at the repo root, not here. A repository
  # amplify.yml overrides any app-level build spec, so setting one in Terraform
  # would be config that silently does nothing.

  # The repo connection is authorised out of band, and app-level environment
  # variables hold secrets set in the console. Terraform must not fight either —
  # environment_variables is a whole map, so managing it here would delete them.
  lifecycle {
    ignore_changes = [access_token, oauth_token, environment_variables]
  }
}

resource "aws_amplify_branch" "production" {
  app_id      = aws_amplify_app.payment_portal_dashboard.id
  branch_name = var.production_branch
  framework   = "Next.js - SSR"
  stage       = var.environment == "prod" ? "PRODUCTION" : "DEVELOPMENT"

  enable_auto_build = true
}

# Issues the ACM certificate and writes the ALIAS record into the hosted zone.
# Only the production branch is attached; preview branches stay on amplifyapp.com.
resource "aws_amplify_domain_association" "this" {
  app_id      = aws_amplify_app.payment_portal_dashboard.id
  domain_name = var.dashboard_domain

  sub_domain {
    branch_name = aws_amplify_branch.production.branch_name
    prefix      = ""
  }

  wait_for_verification = false
}

# Rename only — without this Terraform would destroy and recreate the app,
# which would sever the repo connection it cannot rebuild.
moved {
  from = aws_amplify_app.this
  to   = aws_amplify_app.payment_portal_dashboard
}
