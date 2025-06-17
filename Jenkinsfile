// ===================================================================
// Jenkinsfile (CI + CD for 3-tier Node.js App on EKS)
// ===================================================================

pipeline {
    agent any

    environment {
        AWS_REGION         = 'us-west-2'
        AWS_ACCOUNT_ID     = '889818960214'
        ECR_REPO_NAME      = 'my-app-repo'
        S3_BUCKET_NAME     = 'my-elb-logs-apxa7m1w'
        
        AWS_CREDENTIALS_ID = 'aws-credentials'
        GITHUB_TOKEN_ID    = 'my-github-pat'
        
        IMAGE_TAG          = "${BUILD_NUMBER}"
        BACKEND_IMAGE_URL  = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:3tier-nodejs-backend-${IMAGE_TAG}"
        FRONTEND_IMAGE_URL = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:3tier-nodejs-frontend-${IMAGE_TAG}"
    }

    stages {
        stage('Checkout') {
            steps {
                echo "🔄 Checking out code from branch: ${env.BRANCH_NAME}"
                checkout scm
            }
        }

        stage('Build, Scan & Push Images') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('backend') {
                            script {
                                def backendImage = docker.build(env.BACKEND_IMAGE_URL, '.')

                                docker.withRegistry("https://${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com", "ecr:${env.AWS_REGION}:${AWS_CREDENTIALS_ID}") {
                                    echo "Pushing Backend image to ECR..."
                                    backendImage.push()

                                    echo "Scanning Backend image with Trivy..."
                                    sh "trivy image --exit-code 0 --severity HIGH,CRITICAL ${env.BACKEND_IMAGE_URL} > backend_scan_report.txt"
                                }

                                withAWS(credentials: AWS_CREDENTIALS_ID, region: env.AWS_REGION) {
                                    script {
                                        try {
                                            sh "aws s3 cp backend_scan_report.txt s3://${env.S3_BUCKET_NAME}/scan-reports/backend-report-${env.IMAGE_TAG}.txt"
                                            echo "✅ Backend scan report uploaded to S3"
                                        } catch (Exception e) {
                                            echo "⚠️ Failed to upload backend scan report to S3: ${e.getMessage()}"
                                            echo "Scan report contents:"
                                            sh "cat backend_scan_report.txt"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            script {
                                def frontendImage = docker.build(env.FRONTEND_IMAGE_URL, '.')

                                docker.withRegistry("https://${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com", "ecr:${env.AWS_REGION}:${AWS_CREDENTIALS_ID}") {
                                    echo "Pushing Frontend image to ECR..."
                                    frontendImage.push()

                                    echo "Scanning Frontend image with Trivy..."
                                    sh "trivy image --exit-code 0 --severity HIGH,CRITICAL ${env.FRONTEND_IMAGE_URL} > frontend_scan_report.txt"
                                }

                                withAWS(credentials: AWS_CREDENTIALS_ID, region: env.AWS_REGION) {
                                    script {
                                        try {
                                            sh "aws s3 cp frontend_scan_report.txt s3://${env.S3_BUCKET_NAME}/scan-reports/frontend-report-${env.IMAGE_TAG}.txt"
                                            echo "✅ Frontend scan report uploaded to S3"
                                        } catch (Exception e) {
                                            echo "⚠️ Failed to upload frontend scan report to S3: ${e.getMessage()}"
                                            echo "Scan report contents:"
                                            sh "cat frontend_scan_report.txt"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Update K8s Manifests') {
            steps {
                withCredentials([string(credentialsId: GITHUB_TOKEN_ID, variable: 'GITHUB_TOKEN')]) {
                    sh 'git config user.email "jenkins@ci-cd.com"'
                    sh 'git config user.name "Jenkins CI Bot"'
                    
                    echo "Updating backend deployment manifest..."
                    sh "sed -i 's|image:.*|image: ${env.BACKEND_IMAGE_URL}|g' ./k8s/02-backend.yaml"

                    echo "Updating frontend deployment manifest..."
                    sh "sed -i 's|image:.*|image: ${env.FRONTEND_IMAGE_URL}|g' ./k8s/03-frontend.yaml"

                    sh 'git remote set-url origin https://${GITHUB_TOKEN}@github.com/MostafaAssaff/3tier-react-app.git'
                    
                    sh 'git add ./k8s/02-backend.yaml ./k8s/03-frontend.yaml'
                    sh "git commit -m 'Deploy: Update image tags for build #${BUILD_NUMBER}'"
                    sh 'git push origin HEAD:main'
                }
            }
        }

        stage('Deploy to EKS') {
            steps {
                withAWS(credentials: AWS_CREDENTIALS_ID, region: env.AWS_REGION) {
                    script {
                        echo "⎈ Setting up kubeconfig for EKS..."
                        sh """
                            aws eks update-kubeconfig --region ${env.AWS_REGION} --name my-eks-cluster
                        """

                        echo "🚀 Applying Kubernetes manifests..."
                        sh """
                            kubectl apply -f ./k8s/01-mongo.yaml
                            kubectl apply -f ./k8s/02-backend.yaml
                            kubectl apply -f ./k8s/03-frontend.yaml
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "🧹 Cleaning up workspace."
                cleanWs()
            }
        }
        success {
            echo "✅ Build and deployment completed successfully!"
        }
        failure {
            echo "❌ Pipeline failed."
        }
    }
}
