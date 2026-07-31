data "aws_caller_identity" "current" {}

# Already exists in each account (created for the backend repo); AWS allows only one per URL.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  account_id  = data.aws_caller_identity.current.account_id

  repo_immutable = "repo:${var.github_org}@${var.github_org_id}/${var.github_repo}@${var.github_repo_id}"
  repo_plain     = "repo:${var.github_org}/${var.github_repo}"

  # Both forms: this org emits immutable numeric IDs; plain form kept as fallback.
  read_only_subs = [
    "${local.repo_immutable}:pull_request",
    "${local.repo_plain}:pull_request",
  ]

  deployer_subs = [
    "${local.repo_immutable}:ref:refs/heads/main",
    "${local.repo_plain}:ref:refs/heads/main",
  ]

  state_bucket_arn = "arn:aws:s3:::${var.state_bucket_name}"

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
      ]
      Resource = "*"
    },
    {
      Effect   = "Allow"
      Action   = ["iam:GetRole", "iam:GetRolePolicy", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies"]
      Resource = "arn:aws:iam::${local.account_id}:role/${var.project_name}-*"
    },
    {
      Effect   = "Allow"
      Action   = ["iam:GetOpenIDConnectProvider"]
      Resource = "arn:aws:iam::${local.account_id}:oidc-provider/token.actions.githubusercontent.com"
    },
    {
      # Cannot be resource-scoped; the data source enumerates providers before reading one.
      Effect   = "Allow"
      Action   = ["iam:ListOpenIDConnectProviders"]
      Resource = "*"
    },
  ]
}

locals {
  assume_role_policy_for = {
    for k, subs in { read_only = local.read_only_subs, deployer = local.deployer_subs } :
    k => jsonencode({
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
              "token.actions.githubusercontent.com:sub" = subs
            }
          }
        }
      ]
    })
  }
}

resource "aws_iam_role" "github_actions_read_only" {
  name               = "${local.name_prefix}-ci-read-only"
  assume_role_policy = local.assume_role_policy_for["read_only"]
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

resource "aws_iam_role" "github_actions_deployer" {
  name               = "${local.name_prefix}-ci-deployer"
  assume_role_policy = local.assume_role_policy_for["deployer"]
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
