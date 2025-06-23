# ========================
# AWS Backup for Jenkins
# ========================
resource "aws_backup_vault" "jenkins" {
  name        = "jenkins-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = {
    Name = "Jenkins Backup Vault"
  }
}

resource "aws_kms_key" "backup" {
  description             = "KMS key for backup"
  deletion_window_in_days = 7

  tags = {
    Name = "Backup KMS Key"
  }
}

resource "aws_kms_alias" "backup" {
  name          = "alias/backup-key"
  target_key_id = aws_kms_key.backup.key_id
}

resource "aws_iam_role" "backup" {
  name = "aws-backup-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_backup_plan" "jenkins" {
  name = "jenkins-backup-plan"

  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.jenkins.name
    schedule          = "cron(0 2 * * ? *)" # Daily at 2 AM

    lifecycle {
      delete_after       = 14
    }

    recovery_point_tags = {
      Environment = "production"
      Application = "jenkins"
    }
  }

  tags = {
    Name = "Jenkins Backup Plan"
  }
}

resource "aws_backup_selection" "jenkins" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "jenkins-backup-selection"
  plan_id      = aws_backup_plan.jenkins.id

  resources = [
    aws_instance.jenkins.arn
  ]

  condition {
    string_equals {
      key   = "aws:ResourceTag/Name"
      value = "Jenkins Server"
    }
  }
}