// Jenkinsfile for NTI-Finale-Project

pipeline {
    agent any

    environment {
        // --- AWS Configuration ---
        AWS_ACCOUNT_ID     = '889818960214'
        AWS_REGION         = 'us-west-2'
        AWS_CREDENTIALS_ID = 'aws-credentials' // Credential ID for AWS access

        // --- ECR Configuration ---
        ECR_BACKEND_NAME   = 'nti-backend-image'
        ECR_FRONTEND_NAME  = 'nti-frontend-image'
        IMAGE_TAG          = "build-${env.BUILD_NUMBER}"
        BACKEND_REPO_URL   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND_NAME}"
        FRONTEND_REPO_URL  = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND_NAME}"

        // --- SonarQube Configuration ---
        SONAR_URL          = 'http://<your-sonarqube-ec2-public-ip>:9000' // IMPORTANT: Update with your SonarQube IP
        SONAR_CRED_ID      = 'SonarQube' // Credential ID for your SonarQube token

        // --- S3 Configuration ---
        S3_REPORTS_BUCKET  = 'fp-statefile-bucket' // Your S3 bucket for Trivy reports
    }

    stages {
        stage('Checkout') {
            steps {
                // Clones the source code from the repository
                checkout scm
            }
        }

        stage('SonarQube Code Analysis') {
            steps {
                script {
                    // This stage scans the code using the sonar-project.properties file
                    def scannerHome = tool 'SonarQubeScanner'
                    withSonarQubeEnv('sonarqube') { // 'sonarqube' must match your Jenkins system config name
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                // This crucial step waits for the analysis to complete and checks if it passed the Quality Gate.
                // If the Quality Gate fails, the pipeline will be aborted.
                timeout(time: 15, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Scan Dockerfiles, Build, and Push to ECR') {
            steps {
                withAWS(credentials: AWS_CREDENTIALS_ID, region: AWS_REGION) {
                    // Login to AWS ECR
                    sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
                }

                script {
                    // Process Backend
                    dir('backend') {
                        echo "--- Scanning Backend Dockerfile ---"
                        // Scan the Dockerfile itself for misconfigurations
                        sh "trivy config --format table --exit-code 0 --severity HIGH,CRITICAL . > backend_dockerfile_report.txt"
                        
                        withAWS(credentials: AWS_CREDENTIALS_ID, region: AWS_REGION) {
                            sh "aws s3 cp backend_dockerfile_report.txt s3://${S3_REPORTS_BUCKET}/backend-dockerfile-report-${env.IMAGE_TAG}.txt"
                        }
                        
                        echo "--- Building and Pushing Backend Image ---"
                        sh "docker build -t ${env.BACKEND_REPO_URL}:${env.IMAGE_TAG} ."
                        sh "docker push ${env.BACKEND_REPO_URL}:${env.IMAGE_TAG}"
                    }
                    
                    // Process Frontend
                    dir('frontend') {
                        echo "--- Scanning Frontend Dockerfile ---"
                        // Scan the Dockerfile itself for misconfigurations
                        sh "trivy config --format table --exit-code 0 --severity HIGH,CRITICAL . > frontend_dockerfile_report.txt"
                        
                        withAWS(credentials: AWS_CREDENTIALS_ID, region: AWS_REGION) {
                             sh "aws s3 cp frontend_dockerfile_report.txt s3://${S3_REPORTS_BUCKET}/frontend-dockerfile-report-${env.IMAGE_TAG}.txt"
                        }

                        echo "--- Building and Pushing Frontend Image ---"
                        sh "docker build -t ${env.FRONTEND_REPO_URL}:${env.IMAGE_TAG} ."
                        sh "docker push ${env.FRONTEND_REPO_URL}:${env.IMAGE_TAG}"
                    }
                }
            }
        }

        stage('Update Helm Values and Push to Git (for ArgoCD)') {
            steps {
                // Use the GitHub token credential you've set up in Jenkins
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh 'git config user.email "jenkins-ci@example.com"'
                    sh 'git config user.name "Jenkins CI"'
                    
                    // Update the image tags in the Helm chart's values.yaml
                    // This is more robust than updating the deployment directly.
                    echo "Updating backend image tag in values.yaml to ${env.IMAGE_TAG}"
                    sh "sed -i 's|tag:.*# backend-tag|tag: ${env.IMAGE_TAG} # backend-tag|g' ./k8s/helm-chart/values.yaml"
                    
                    echo "Updating frontend image tag in values.yaml to ${env.IMAGE_TAG}"
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

    post {
        always {
            echo 'Pipeline finished. Cleaning up workspace.'
            cleanWs()
        }
    }
}
