# ========================
# Outputs
# ========================
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "jenkins_public_ip" {
  description = "Jenkins server public IP"
  value       = aws_instance.jenkins.public_ip
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.main.repository_url
}

output "s3_bucket_name" {
  description = "S3 bucket name for ELB logs"
  value       = aws_s3_bucket.elb_logs.bucket
}

output "secrets_manager_secret_name" {
  description = "AWS Secrets Manager secret name for RDS credentials"
  value       = aws_secretsmanager_secret.db_credentials.name
}

#Add this to your outputs.tf file (or at the end of your main.tf)
output "elb_logs_bucket_name" {
  description = "Name of the S3 bucket for ELB logs"
  value       = aws_s3_bucket.elb_logs.id
}

output "elb_logs_bucket_arn" {
  description = "ARN of the S3 bucket for ELB logs"
  value       = aws_s3_bucket.elb_logs.arn
}

output "backend_service_account_role_arn" {
  description = "ARN of the IAM role for backend service account"
  value       = aws_iam_role.backend_service_account_role.arn
}

output "eks_oidc_issuer_url" {
  description = "EKS OIDC issuer URL"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}