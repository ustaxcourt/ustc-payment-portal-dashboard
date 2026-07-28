data "aws_caller_identity" "current" {}

# Already exists in each account (created for the backend repo); AWS allows only one per URL.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  # Both accepted: this org's tokens carry immutable numeric IDs, the plain form
  # is kept so the roles survive that setting being turned off.
  github_subs = [
    "repo:${var.github_org}@${var.github_org_id}/${var.github_repo}@${var.github_repo_id}:*",
    "repo:${var.github_org}/${var.github_repo}:*",
  ]

  state_bucket_arn = "arn:aws:s3:::${var.state_bucket_name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GithubOIDCAssumeRole"
        Effect = "Allow"
        Action = "sts:AssumeRoleWithWebIdentity"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.github.arn
        }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = local.github_subs
          }
        }
      }
    ]
  })

  state_read_statements = [
    {
      Effect   = "Allow"
      Action   = ["s3:ListBucket", "s3:GetBucketVersioning"]
      Resource = local.state_bucket_arn
    },
    {
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "${local.state_bucket_arn}/*"
    },
  ]

  # `terraform plan` refreshes existing resources, so even the read-only role needs these.
  plan_read_statements = [
    {
      Effect = "Allow"
      Action = [
        "amplify:Get*",
        "amplify:List*",
        "route53:Get*",
        "route53:List*",
        "acm:Describe*",
        "acm:List*",
        "acm:GetCertificate",
        "iam:Get*",
        "iam:List*",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecrets",
      ]
      Resource = "*"
    },
  ]
}

# Used by terraform-plan.yml on pull requests.
resource "aws_iam_role" "github_actions_read_only" {
  name               = "${local.name_prefix}-ci-read-only"
  assume_role_policy = local.assume_role_policy
}

resource "aws_iam_role_policy" "github_actions_read_only" {
  name = "${local.name_prefix}-ci-read-only"
  role = aws_iam_role.github_actions_read_only.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      local.state_read_statements,
      local.plan_read_statements,
      [
        # The S3 backend takes a lock even for a plan.
        {
          Effect   = "Allow"
          Action   = ["s3:PutObject", "s3:DeleteObject"]
          Resource = "${local.state_bucket_arn}/*.tflock"
        },
      ],
    )
  })
}

# Hosting/DNS/ACM write permissions land in Phase 2, alongside the resources they grant.
resource "aws_iam_role" "github_actions_deployer" {
  name               = "${local.name_prefix}-ci-deployer"
  assume_role_policy = local.assume_role_policy
}

resource "aws_iam_role_policy" "github_actions_deployer" {
  name = "${local.name_prefix}-ci-deployer"
  role = aws_iam_role.github_actions_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      local.state_read_statements,
      local.plan_read_statements,
      [
        {
          Effect   = "Allow"
          Action   = ["s3:PutObject", "s3:DeleteObject"]
          Resource = "${local.state_bucket_arn}/*"
        },
      ],
    )
  })
}
