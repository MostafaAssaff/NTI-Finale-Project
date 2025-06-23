# ========================
# Jenkins EC2 Instance
# ========================
resource "aws_key_pair" "jenkins" {
  key_name   = "jenkins-key"
  public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDRJE8P7n2WvA1Db/2jq04fTNmjdmqB60Qe6y0qblQKRf6i0eX10iZZXQBkxbVb/aPtTTHhhzDu37cm4KvRR8fKGyX6fZFgM/ycq1cxl20Xj/MwpOK5G6xOK38p6FcDRYCVEfR8QCMrx0fSaleHGgTPGsu9hjYpkvMEmCRBWa+JP5rV2lK7LynKD6e95a7LMorJLdeijweF1EazPgdRfqFNyXF4Ybmv847U3FtuzbYp7RvyCn6dVVb37SZcAaAlNF5Ixqd725Vn2Q2Qd9K1OTDe1iGPa3jjmucgiw224Gcj542Aq5zXIwOdZ8Hrft5SPq+VKA7cGlo6z1E4hQSi5co/" # Replace with your public key
}

resource "aws_instance" "jenkins" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.jenkins_instance_type
  key_name               = aws_key_pair.jenkins.key_name
  vpc_security_group_ids = [aws_security_group.jenkins.id]
  subnet_id              = aws_subnet.public[0].id
  iam_instance_profile = aws_iam_instance_profile.jenkins_instance_profile.name
  user_data = base64encode(<<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y openjdk-11-jdk wget gnupg2

    # Install Jenkins
    wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io.key | apt-key add -
    sh -c 'echo deb https://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'
    apt-get update
    apt-get install -y jenkins

    # Install Docker
    apt-get install -y docker.io
    usermod -aG docker jenkins
    systemctl start docker
    systemctl enable docker
    systemctl start jenkins
    systemctl enable jenkins

    # Install AWS CLI
    apt-get install -y awscli
  EOF
  )

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  tags = {
    Name = "Jenkins Server"
  }
}

# ===================================
# IAM Role for Jenkins EC2 Instance
# ===================================
resource "aws_iam_role" "jenkins_ec2_role" {
  name = "jenkins-ec2-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent_policy_attachment" {
  role       = aws_iam_role.jenkins_ec2_role.name
  # This is the standard AWS policy that gives all necessary permissions for CloudWatch Agent
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}


resource "aws_iam_instance_profile" "jenkins_instance_profile" {
  name = "jenkins-instance-profile"
  role = aws_iam_role.jenkins_ec2_role.name
}

resource "aws_iam_role_policy_attachment" "ecr_power_user_policy_attachment" {
  role       = aws_iam_role.jenkins_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}
