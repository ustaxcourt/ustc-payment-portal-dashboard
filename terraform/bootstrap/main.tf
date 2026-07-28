terraform {
  required_version = "~> 1.15.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # No backend block: this root creates the bucket the others store state in.
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "ustc-payment-portal-dashboard"
      ManagedBy = "terraform"
      Purpose   = "terraform-backend"
    }
  }
}

data "aws_caller_identity" "current" {}

# Guards against applying to the wrong account.
check "correct_account" {
  assert {
    condition = data.aws_caller_identity.current.account_id == var.expected_account_id
    error_message = format(
      "Wrong AWS account: credentials are for %s but var.expected_account_id is %s. Check your --profile.",
      data.aws_caller_identity.current.account_id,
      var.expected_account_id,
    )
  }
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name

  tags = {
    Name      = var.state_bucket_name
    Project   = "ustc-payment-portal-dashboard"
    ManagedBy = "terraform"
    Purpose   = "terraform-state"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
