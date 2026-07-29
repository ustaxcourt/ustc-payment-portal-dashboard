terraform {
  required_version = "~> 1.15.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.56.0"
    }
  }

  backend "s3" {}
}

provider "aws" {
  region = local.aws_region

  default_tags {
    tags = {
      Project     = "ustc-payment-portal-dashboard"
      Environment = local.environment
      ManagedBy   = "terraform"
    }
  }
}
