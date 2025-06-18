// Simplified Jenkinsfile for NTI-Finale-Project

pipeline {
    agent any

    environment {
        // --- AWS Configuration ---
        // This requires a single Jenkins credential of type "AWS Credentials" 
        // with the ID 'aws-credentials'. Jenkins will automatically use this 
        // to set the required AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.
        AWS_CREDS          = credentials('aws-credentials')
        AWS_REGION         = 'us-west-2'
        AWS_ACCOUNT_ID     = '889818960214'
        
        // --- ECR Configuration ---
        ECR_BACKEND_NAME   = 'my-app-repo'
        ECR_FRONTEND_NAME  = 'my-app-repo' // Using the same repository for both images
        IMAGE_TAG          = "${env.BUILD_NUMBER}"
        BACKEND_REPO_URL   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND_NAME}"
        FRONTEND_REPO_URL  = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND_NAME}"
        
        // --- S3 Configuration ---
        // Appending the AWS Account ID to make the bucket name globally unique.
        S3_REPORTS_BUCKET  = "fp-statefile-bucket-${AWS_ACCOUNT_ID}"

        // --- Tools Configuration ---
        // Add the local bin directory to the PATH for this pipeline
        PATH = "${env.WORKSPACE}/bin:${env.PATH}"
    }

    stages {
        stage('Install Tools') {
            steps {
                echo "--- Checking for and installing Trivy if needed (no sudo required) ---"
                sh '''
                    if ! command -v trivy &> /dev/null
                    then
                        echo "Trivy not found. Installing locally..."
                        mkdir -p ${WORKSPACE}/bin
                        export TRIVY_VERSION='0.52.2'
                        curl -Lo trivy.tar.gz https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz
                        tar -zxvf trivy.tar.gz -C ${WORKSPACE}/bin/ trivy
                        rm trivy.tar.gz
                        chmod +x ${WORKSPACE}/bin/trivy
                        echo "Trivy v${TRIVY_VERSION} installed at ${WORKSPACE}/bin/trivy"
                    else
                        echo "Trivy is already installed."
                    fi
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                echo "--- Logging in to AWS ECR ---"
                // The AWS CLI will automatically use the credentials set in the environment block
                sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
            }
        }

        stage('Setup ECR Repositories') {
            steps {
                echo "--- Ensuring ECR repositories exist ---"
                sh """
                    aws ecr describe-repositories --repository-names ${ECR_BACKEND_NAME} --region ${AWS_REGION} > /dev/null 2>&1 || \\
                    aws ecr create-repository --repository-name ${ECR_BACKEND_NAME} --region ${AWS_REGION} --image-scanning-configuration scanOnPush=true
                    
                    aws ecr describe-repositories --repository-names ${ECR_FRONTEND_NAME} --region ${AWS_REGION} > /dev/null 2>&1 || \\
                    aws ecr create-repository --repository-name ${ECR_FRONTEND_NAME} --region ${AWS_REGION} --image-scanning-configuration scanOnPush=true
                """
            }
        }

        stage('Setup S3 Bucket') {
            steps {
                echo "--- Ensuring S3 bucket '${S3_REPORTS_BUCKET}' exists ---"
                sh """
                    if aws s3api head-bucket --bucket "${S3_REPORTS_BUCKET}" 2>/dev/null; then
                        echo "Bucket '${S3_REPORTS_BUCKET}' already exists."
                    else
                        echo "Bucket '${S3_REPORTS_BUCKET}' not found. Creating it..."
                        aws s3api create-bucket --bucket "${S3_REPORTS_BUCKET}" --region "${AWS_REGION}" --create-bucket-configuration LocationConstraint=${AWS_REGION}
                        echo "Bucket '${S3_REPORTS_BUCKET}' created."
                    fi
                """
            }
        }

        stage('Build, Scan Image, and Push to ECR') {
            steps {
                script {
                    // Process Backend
                    dir('backend') {
                        echo "--- Building Backend Image ---"
                        sh "docker build -t ${env.BACKEND_REPO_URL}:${env.IMAGE_TAG} ."
                        
                        echo "--- Scanning Backend Image with Trivy ---"
                        sh "trivy image --format table --exit-code 0 --severity HIGH,CRITICAL ${env.BACKEND_REPO_URL}:${env.IMAGE_TAG} > backend_scan_report.txt"
                        
                        echo "--- Uploading Backend Report to S3 ---"
                        sh "aws s3 cp backend_scan_report.txt s3://${S3_REPORTS_BUCKET}/backend-report-${env.IMAGE_TAG}.txt"

                        echo "--- Pushing Backend Image to ECR ---"
                        sh "docker push ${env.BACKEND_REPO_URL}:${env.IMAGE_TAG}"
                    }
                    
                    // Process Frontend
                    dir('frontend') {
                        echo "--- Building Frontend Image ---"
                        sh "docker build -t ${env.FRONTEND_REPO_URL}:${env.IMAGE_TAG} ."
                        
                        echo "--- Scanning Frontend Image with Trivy ---"
                        sh "trivy image --format table --exit-code 0 --severity HIGH,CRITICAL ${env.FRONTEND_REPO_URL}:${env.IMAGE_TAG} > frontend_scan_report.txt"
                        
                        echo "--- Uploading Frontend Report to S3 ---"
                        sh "aws s3 cp frontend_scan_report.txt s3://${S3_REPORTS_BUCKET}/frontend-report-${env.IMAGE_TAG}.txt"

                        echo "--- Pushing Frontend Image to ECR ---"
                        sh "docker push ${env.FRONTEND_REPO_URL}:${env.IMAGE_TAG}"
                    }
                }
            }
        }

        stage('Update Helm Values and Push to Git') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    echo "--- Committing image tag updates to Git repository ---"
                    sh 'git config user.email "jenkins-ci@example.com"'
                    sh 'git config user.name "Jenkins CI"'
                    
                    // Update the image tags in the Helm chart's values.yaml
                    sh "sed -i 's|tag:.*# backend-tag|tag: ${env.IMAGE_TAG} # backend-tag|g' ./k8s/helm-chart/values.yaml"
                    sh "sed -i 's|tag:.*# frontend-tag|tag: ${env.IMAGE_TAG} # frontend-tag|g' ./k8s/helm-chart/values.yaml"

                    // Set remote URL with token for authentication
                    sh 'git remote set-url origin https://${GITHUB_TOKEN}@github.com/MostafaAssaff/NTI-Finale-Project.git'
                    
                    // Add, commit, and push the changes
                    sh 'git add ./k8s/helm-chart/values.yaml'
                    sh "git commit -m 'ci: Update image tags to version ${env.IMAGE_TAG}'"
                    sh 'git push origin HEAD:main'
                }
            }
        }
    }
}
