// Updated Jenkinsfile for NTI-Finale-Project with ArgoCD Integration

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
        ECR_BACKEND_NAME   = 'backend-repo'
        ECR_FRONTEND_NAME  = 'frontend-repo'
        IMAGE_TAG          = "${env.BUILD_NUMBER}"
        BACKEND_REPO_URL   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND_NAME}"
        FRONTEND_REPO_URL  = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND_NAME}"
        
        // --- S3 Configuration ---
        // Appending the AWS Account ID to make the bucket name globally unique.
        S3_REPORTS_BUCKET  = "fp-statefile-bucket-${AWS_ACCOUNT_ID}"

        // --- ArgoCD Configuration ---
        ARGOCD_SERVER      = 'your-argocd-server.com'  // Update with your ArgoCD server URL
        ARGOCD_TOKEN       = credentials('argocd-token') // ArgoCD authentication token
        
        // --- Tools Configuration ---
        // Add the local bin directory to the PATH for this pipeline
        PATH = "${env.WORKSPACE}/bin:${env.PATH}"
    }

    stages {
        stage('Install Tools') {
            steps {
                echo "--- Checking for and installing required tools ---"
                sh '''
                    # Install Trivy
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
                    
                    # Install ArgoCD CLI (optional, for direct API calls)
                    if ! command -v argocd &> /dev/null
                    then
                        echo "ArgoCD CLI not found. Installing locally..."
                        curl -sSL -o ${WORKSPACE}/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
                        chmod +x ${WORKSPACE}/bin/argocd
                        echo "ArgoCD CLI installed at ${WORKSPACE}/bin/argocd"
                    else
                        echo "ArgoCD CLI is already installed."
                    fi
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                echo "--- Logging in to AWS ECR ---"
                sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
            }
        }

        stage('Setup ECR Repositories') {
            steps {
                echo "--- Ensuring ECR repositories exist ---"
                sh """
                    # Backend repository
                    aws ecr describe-repositories --repository-names ${ECR_BACKEND_NAME} --region ${AWS_REGION} > /dev/null 2>&1 || \\
                    aws ecr create-repository --repository-name ${ECR_BACKEND_NAME} --region ${AWS_REGION} --image-scanning-configuration scanOnPush=true
                    
                    # Frontend repository
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

        stage('Build and Push Images') {
            parallel {
                stage('Backend') {
                    steps {
                        script {
                            dir('backend') {
                                echo "--- Building Backend Image ---"
                                sh "docker build -t ${env.BACKEND_REPO_URL}:${env.IMAGE_TAG} -t ${env.BACKEND_REPO_URL}:latest ."
                                
                                echo "--- Scanning Backend Image with Trivy ---"
                                sh """
                                    trivy image --format table --exit-code 0 --severity HIGH,CRITICAL ${env.BACKEND_REPO_URL}:${env.IMAGE_TAG} > backend_scan_report.txt || true
                                    echo "Backend scan completed"
                                """
                                
                                echo "--- Uploading Backend Report to S3 ---"
                                sh "aws s3 cp backend_scan_report.txt s3://${S3_REPORTS_BUCKET}/backend-report-${env.IMAGE_TAG}.txt"

                                echo "--- Pushing Backend Image to ECR ---"
                                sh """
                                    docker push ${env.BACKEND_REPO_URL}:${env.IMAGE_TAG}
                                    docker push ${env.BACKEND_REPO_URL}:latest
                                """
                            }
                        }
                    }
                }
                
                stage('Frontend') {
                    steps {
                        script {
                            dir('frontend') {
                                echo "--- Building Frontend Image ---"
                                sh "docker build -t ${env.FRONTEND_REPO_URL}:${env.IMAGE_TAG} -t ${env.FRONTEND_REPO_URL}:latest ."
                                
                                echo "--- Scanning Frontend Image with Trivy ---"
                                sh """
                                    trivy image --format table --exit-code 0 --severity HIGH,CRITICAL ${env.FRONTEND_REPO_URL}:${env.IMAGE_TAG} > frontend_scan_report.txt || true
                                    echo "Frontend scan completed"
                                """
                                
                                echo "--- Uploading Frontend Report to S3 ---"
                                sh "aws s3 cp frontend_scan_report.txt s3://${S3_REPORTS_BUCKET}/frontend-report-${env.IMAGE_TAG}.txt"

                                echo "--- Pushing Frontend Image to ECR ---"
                                sh """
                                    docker push ${env.FRONTEND_REPO_URL}:${env.IMAGE_TAG}
                                    docker push ${env.FRONTEND_REPO_URL}:latest
                                """
                            }
                        }
                    }
                }
            }
        }

        stage('Update Helm Values and Push to Git') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    echo "--- Updating Helm values with new image tags ---"
                    sh '''
                        # Configure Git
                        git config user.email "jenkins-ci@example.com"
                        git config user.name "Jenkins CI"
                        
                        # Create backup of original values.yaml
                        cp ./k8s/helm-chart/values.yaml ./k8s/helm-chart/values.yaml.backup
                        
                        # Update the image tags in values.yaml for both frontend and backend
                        sed -i "s|repository: .*backend.*|repository: ${BACKEND_REPO_URL}|g" ./k8s/helm-chart/values.yaml
                        sed -i "s|repository: .*frontend.*|repository: ${FRONTEND_REPO_URL}|g" ./k8s/helm-chart/values.yaml
                        
                        # Update tags - assuming your values.yaml has a structure like:
                        # backend:
                        #   image:
                        #     tag: "some-tag"
                        # frontend:
                        #   image:
                        #     tag: "some-tag"
                        
                        # Backend tag update
                        sed -i "/backend:/,/frontend:/{/image:/,/tag:/{s/tag: .*/tag: \"${IMAGE_TAG}\"/}}" ./k8s/helm-chart/values.yaml
                        
                        # Frontend tag update  
                        sed -i "/frontend:/,/^[a-zA-Z]/{/image:/,/tag:/{s/tag: .*/tag: \"${IMAGE_TAG}\"/}}" ./k8s/helm-chart/values.yaml
                        
                        # Alternative approach if the above doesn't work - update by line numbers or specific patterns
                        # You might need to adjust these based on your exact values.yaml structure
                        
                        echo "--- Updated values.yaml content ---"
                        cat ./k8s/helm-chart/values.yaml
                        
                        echo "--- Committing changes to Git ---"
                        # Set remote URL with token for authentication
                        git remote set-url origin https://${GITHUB_TOKEN}@github.com/MostafaAssaff/NTI-Finale-Project.git
                        
                        # Add, commit, and push the changes
                        git add ./k8s/helm-chart/values.yaml
                        git commit -m "ci: Update image tags to version ${IMAGE_TAG}" || echo "No changes to commit"
                        git push origin HEAD:main
                    '''
                }
            }
        }

        stage('Trigger ArgoCD Sync') {
            steps {
                echo "--- Triggering ArgoCD Applications Sync ---"
                script {
                    try {
                        // Option 1: Using ArgoCD CLI (if available)
                        sh '''
                            # Login to ArgoCD (if CLI is available)
                            if command -v argocd &> /dev/null; then
                                echo "Using ArgoCD CLI for sync"
                                argocd login ${ARGOCD_SERVER} --username admin --password ${ARGOCD_TOKEN} --insecure
                                argocd app sync frontend-app --timeout 300
                                argocd app sync backend-app --timeout 300
                                argocd app wait frontend-app --timeout 300
                                argocd app wait backend-app --timeout 300
                            else
                                echo "ArgoCD CLI not available, using API calls"
                            fi
                        '''
                    } catch (Exception e) {
                        echo "ArgoCD CLI sync failed, trying API approach: ${e.getMessage()}"
                    }
                    
                    // Option 2: Using ArgoCD REST API
                    sh '''
                        echo "Triggering sync via ArgoCD API"
                        
                        # Sync Frontend Application
                        curl -k -X POST \
                          -H "Authorization: Bearer ${ARGOCD_TOKEN}" \
                          -H "Content-Type: application/json" \
                          -d '{"revision": "HEAD", "prune": true, "dryRun": false, "strategy": {"hook": {}}}' \
                          "${ARGOCD_SERVER}/api/v1/applications/frontend-app/sync" || echo "Frontend sync API call completed"
                        
                        # Sync Backend Application  
                        curl -k -X POST \
                          -H "Authorization: Bearer ${ARGOCD_TOKEN}" \
                          -H "Content-Type: application/json" \
                          -d '{"revision": "HEAD", "prune": true, "dryRun": false, "strategy": {"hook": {}}}' \
                          "${ARGOCD_SERVER}/api/v1/applications/backend-app/sync" || echo "Backend sync API call completed"
                        
                        echo "ArgoCD sync requests sent"
                    '''
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                echo "--- Verifying ArgoCD Applications Status ---"
                script {
                    // Wait a bit for sync to process
                    sleep(30)
                    
                    sh '''
                        echo "Checking ArgoCD application status..."
                        
                        # Check Frontend App Status
                        curl -k -H "Authorization: Bearer ${ARGOCD_TOKEN}" \
                             "${ARGOCD_SERVER}/api/v1/applications/frontend-app" \
                             | jq '.status.sync.status, .status.health.status' || echo "Could not fetch frontend status"
                        
                        # Check Backend App Status
                        curl -k -H "Authorization: Bearer ${ARGOCD_TOKEN}" \
                             "${ARGOCD_SERVER}/api/v1/applications/backend-app" \
                             | jq '.status.sync.status, .status.health.status' || echo "Could not fetch backend status"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo "--- Pipeline completed ---"
            // Clean up Docker images to save space
            sh '''
                docker image prune -f
                docker system prune -f --volumes
            '''
        }
        success {
            echo "--- Pipeline succeeded! Images built, pushed, and ArgoCD sync triggered ---"
            // You can add notifications here (Slack, email, etc.)
        }
        failure {
            echo "--- Pipeline failed! Check logs for details ---"
            // You can add failure notifications here
        }
    }
}
