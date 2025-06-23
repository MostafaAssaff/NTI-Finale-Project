# ===========================================
# variables.tf - All Variables
# ===========================================
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "my-eks-cluster"
}

variable "node_group_name" {
  description = "EKS node group name"
  type        = string
  default     = "my-node-group"
}

variable "db_name" {
  description = "RDS database name"
  type        = string
  default     = "mydb"
}

variable "jenkins_instance_type" {
  description = "Jenkins EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "jenkins_public_key" {
  description = "Public SSH key for Jenkins instance"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "my-project"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

