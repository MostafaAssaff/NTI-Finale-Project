project video : https://drive.google.com/drive/folders/1UguW8HRxsOGaQ0GH47XtdaTwsOcvoI66?usp=drive_link



🚀 Project Summary

This project establishes a fully automated CI/CD pipeline using Jenkins, Terraform, AWS services, and ArgoCD. It builds, scans, and deploys both backend and frontend Docker images while ensuring security and reliability across the process. Infrastructure is provisioned through Terraform, embracing Infrastructure as Code (IaC) for maintainability and scalability.
✅ Requirements

    Jenkins (installed via Ansible)

    AWS CLI (configured with proper IAM permissions)

    Docker

    Trivy (for container vulnerability scanning)

    AWS ECR (for image storage)

    AWS S3 (for scan report archiving)

    GitHub (code repository)

    ArgoCD (for GitOps-based deployments)

    AWS CloudWatch Agent (installed on all EC2 nodes)

    AWS Backup (configured for daily Jenkins instance backups)

    Terraform        

    Prometheus

    gravana

🛠️ Pipeline Overview (Jenkins)

Defined in the Jenkinsfile, the pipeline includes:

    Infrastructure Provisioning: Using Terraform to set up all required AWS resources.

    Jenkins Setup: Installed via Ansible and configured for automation tasks.

    Docker & Trivy Installation: Set up on Jenkins to handle image building and security scans.

    ECR Repositories: Created for backend and frontend Docker images.

    S3 Configuration: A bucket is used to store Trivy scan reports.

    Jenkins Credentials:

        AWS access keys

        GitHub token

    GitHub Integration: Source code and Kubernetes manifests are stored here.

    ArgoCD Configuration:

        Installed on EKS (via operator)

        Connected to the GitHub repo for auto-sync and deployment

    CloudWatch Agent Deployment: Monitors all nodes.

    AWS Backup Setup: Takes daily snapshots of the Jenkins server.

⚙️ ArgoCD Setup & Sync

    Install ArgoCD Operator: Using Kubernetes Operator pattern.

    Deploy ArgoCD Instance: Using the custom resource definition (CRD).

    Configure Repos and Sync Policies:

        Link to the GitHub repo.

        Enable auto-sync for continuous deployment.

🔄 How Deployment Works

Every time Jenkins pushes updated Kubernetes manifests to GitHub, ArgoCD automatically picks up the changes and redeploys the updated application to the EKS cluster — enabling true GitOps.
🧩 Final Notes

This project showcases a full DevOps pipeline that automates infrastructure provisioning, container image management, security scanning, and continuous delivery. It's a production-grade setup designed for modern cloud-native applications.

Contributions are welcome. Let's build a better DevOps ecosystem together! 🤝
