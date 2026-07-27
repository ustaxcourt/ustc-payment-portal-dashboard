variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "Name of the S3 bucket for Terraform state in this account"
  type        = string
}

variable "expected_account_id" {
  description = "AWS account ID this bootstrap is intended for; guards against a mis-targeted apply"
  type        = string
}
