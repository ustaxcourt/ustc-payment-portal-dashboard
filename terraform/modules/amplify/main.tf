data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  name = "${var.project_name}-${var.environment}"
}

# Without a service role the SSR compute never starts and requests 404.
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
        Resource = "arn:aws:kms:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:alias/aws/ssm"
        Condition = {
          StringEquals = {
            "kms:ViaService"    = "ssm.${data.aws_region.current.region}.amazonaws.com"
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
    ]
  })
}

# Treat as unreplaceable: the repo connection is made once in the console and
# imported, and Terraform holds no GitHub credential to rebuild it. This is also
# why enable_performance_mode (ForceNew) is omitted.
resource "aws_amplify_app" "payment_portal_dashboard" {
  name                 = local.name
  repository           = var.repository_url
  platform             = "WEB_COMPUTE"
  iam_service_role_arn = aws_iam_role.amplify.arn

  enable_branch_auto_build = true

  # Opt-in per environment; stg and prod pass an empty list.
  enable_auto_branch_creation   = length(var.preview_branch_patterns) > 0
  enable_branch_auto_deletion   = length(var.preview_branch_patterns) > 0
  auto_branch_creation_patterns = var.preview_branch_patterns

  dynamic "auto_branch_creation_config" {
    for_each = length(var.preview_branch_patterns) > 0 ? [1] : []

    content {
      enable_auto_build           = true
      framework                   = "Next.js - SSR"
      stage                       = "DEVELOPMENT"
      enable_pull_request_preview = false
    }
  }

  # No build_spec: the repo's amplify.yml overrides it anyway. Tokens and env
  # vars are set in the console, and env vars are a whole map — managing them
  # here would delete them.
  lifecycle {
    ignore_changes = [access_token, oauth_token, environment_variables]
  }
}

resource "aws_amplify_branch" "production" {
  app_id      = aws_amplify_app.payment_portal_dashboard.id
  branch_name = var.production_branch
  framework   = "Next.js - SSR"
  stage       = lookup({ prod = "PRODUCTION", stg = "BETA" }, var.environment, "DEVELOPMENT")

  enable_auto_build = true

  environment_variables = {
    NEXTAUTH_URL = "https://${var.dashboard_domain}"
  }
}

# Issues the ACM certificate and writes the ALIAS into the hosted zone. Only the
# production branch is attached; previews stay on amplifyapp.com.
resource "aws_amplify_domain_association" "this" {
  app_id      = aws_amplify_app.payment_portal_dashboard.id
  domain_name = var.dashboard_domain

  sub_domain {
    branch_name = aws_amplify_branch.production.branch_name
    prefix      = ""
  }

  wait_for_verification = false
}

# Rename only; without this Terraform would replace the app.
moved {
  from = aws_amplify_app.this
  to   = aws_amplify_app.payment_portal_dashboard
}
