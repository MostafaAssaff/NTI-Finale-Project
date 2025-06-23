# ===================================================================
# iam.tf - This file contains all IAM Roles and Policies for the project.
# ===================================================================

# ===================================================================
# IAM OIDC Provider for EKS
# This is the crucial link between EKS and IAM for service accounts.
# It MUST be defined before any role that uses it.
# ===================================================================
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# ========================
# IAM Roles for EKS Cluster & Nodes
# ========================
resource "aws_iam_role" "eks_cluster" {
  name = "eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role" "eks_nodes" {
  name = "eks-nodes-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

# ===================================================================
# IAM Role for the Backend Service Account (to access DynamoDB)
# This is the new section you need.
# ===================================================================

# 1. Create the IAM Role for the backend service account
resource "aws_iam_role" "backend_service_account_role" {
  name = "backend-sa-role"

  # Trust policy to allow the K8s service account to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        },
        Action = "sts:AssumeRoleWithWebIdentity",
        Condition = {
          StringEquals = {
            # Link to the OIDC provider and the specific service account
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:default:backend-service-account"
          }
        }
      }
    ]
  })
}

# 2. Define the policy document with DynamoDB permissions
data "aws_iam_policy_document" "backend_dynamodb_policy_doc" {
  statement {
    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:Scan",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem"
    ]
    resources = [
      aws_dynamodb_table.todos_table.arn,
    ]
  }
}

# 3. Create the IAM policy from the document
resource "aws_iam_policy" "backend_dynamodb_policy" {
  name   = "BackendDynamoDBPolicy"
  policy = data.aws_iam_policy_document.backend_dynamodb_policy_doc.json
}

# 4. Attach the DynamoDB policy to the role
resource "aws_iam_role_policy_attachment" "backend_dynamodb_attach" {
  policy_arn = aws_iam_policy.backend_dynamodb_policy.arn
  role       = aws_iam_role.backend_service_account_role.name
}