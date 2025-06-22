pipeline {
    agent any

    environment {
        AWS_CREDS          = credentials('aws-credentials')
        AWS_REGION         = 'us-west-2'
        AWS_ACCOUNT_ID     = '889818960214'
        
        ECR_BACKEND_NAME   = 'my-app-backend-repo'
        ECR_FRONTEND_NAME  = 'my-app-frontend-repo'
        IMAGE_TAG          = "${env.BUILD_NUMBER}"
        BACKEND_REPO_URL   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND_NAME}"
        FRONTEND_REPO_URL  = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND_NAME}"

        S3_REPORTS_BUCKET  = "fp-statefile-bucket-${AWS_ACCOUNT_ID}"
        PATH = "${env.WORKSPACE}/bin:${env.PATH}"

        // ✅ Backend LoadBalancer ELB URL
        BACKEND_API_URL    = "http://a854e4d1a13dc47f48088f62bf9508df-1650274140.us-west-2.elb.amazonaws.com:3001/api"
    }

    stages {
        stage('Install Tools') {
            steps {
                sh '''
                    if ! command -v trivy &> /dev/null
                    then
                        mkdir -p ${WORKSPACE}/bin
                        export TRIVY_VERSION='0.52.2'
                        curl -Lo trivy.tar.gz https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz
                        tar -zxvf trivy.tar.gz -C ${WORKSPACE}/bin/ trivy
                        rm trivy.tar.gz
                        chmod +x ${WORKSPACE}/bin/trivy
                    fi
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${BACKEND_REPO_URL}"
            }
        }

        stage('Setup ECR Repositories') {
            steps {
                sh """
                    aws ecr describe-repositories --repository-names ${ECR_BACKEND_NAME} --region ${AWS_REGION} > /dev/null 2>&1 || \
                    aws ecr create-repository --repository-name ${ECR_BACKEND_NAME} --region ${AWS_REGION} --image-scanning-configuration scanOnPush=true
                    
                    aws ecr describe-repositories --repository-names ${ECR_FRONTEND_NAME} --region ${AWS_REGION} > /dev/null 2>&1 || \
                    aws ecr create-repository --repository-name ${ECR_FRONTEND_NAME} --region ${AWS_REGION} --image-scanning-configuration scanOnPush=true
                """
            }
        }

        stage('Setup S3 Bucket') {
            steps {
                sh """
                    if aws s3api head-bucket --bucket "${S3_REPORTS_BUCKET}" 2>/dev/null; then
                        echo "Bucket '${S3_REPORTS_BUCKET}' already exists."
                    else
                        aws s3api create-bucket --bucket "${S3_REPORTS_BUCKET}" --region "${AWS_REGION}" --create-bucket-configuration LocationConstraint=${AWS_REGION}
                    fi
                """
            }
        }

        stage('Build, Scan Image, and Push to ECR') {
            steps {
                script {
                    dir('backend') {
                        sh "docker build -t ${BACKEND_REPO_URL}:${IMAGE_TAG} ."
                        sh "trivy image --format table --exit-code 0 --severity HIGH,CRITICAL ${BACKEND_REPO_URL}:${IMAGE_TAG} > backend_scan_report.txt"
                        sh "aws s3 cp backend_scan_report.txt s3://${S3_REPORTS_BUCKET}/backend-report-${IMAGE_TAG}.txt"
                        sh "docker push ${BACKEND_REPO_URL}:${IMAGE_TAG}"
                    }

                    dir('frontend') {
                        sh """
                            docker build \
                              --build-arg REACT_APP_API_URL=${BACKEND_API_URL} \
                              -t ${FRONTEND_REPO_URL}:${IMAGE_TAG} .
                        """
                        sh "trivy image --format table --exit-code 0 --severity HIGH,CRITICAL ${FRONTEND_REPO_URL}:${IMAGE_TAG} > frontend_scan_report.txt"
                        sh "aws s3 cp frontend_scan_report.txt s3://${S3_REPORTS_BUCKET}/frontend-report-${IMAGE_TAG}.txt"
                        sh "docker push ${FRONTEND_REPO_URL}:${IMAGE_TAG}"
                    }
                }
            }
        }

        stage('Update Helm Values and Push to Git') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh '''
                        git config user.email "jenkins-ci@example.com"
                        git config user.name "Jenkins CI"
                        git remote set-url origin https://${GITHUB_TOKEN}@github.com/MostafaAssaff/NTI-Finale-Project.git

                        git checkout main || git checkout -b main
                        git pull --rebase origin main || true

                        sed -i "s|tag:.*# backend-tag|tag: ${IMAGE_TAG} # backend-tag|g" ./k8s/helm-chart/values.yaml
                        sed -i "s|tag:.*# frontend-tag|tag: ${IMAGE_TAG} # frontend-tag|g" ./k8s/helm-chart/values.yaml

                        git add ./k8s/helm-chart/values.yaml
                        if git diff --cached --quiet; then
                          echo "No changes to commit"
                        else
                          git commit -m "ci: Update image tags to version ${IMAGE_TAG}"
                          git push origin main
                        fi

                        git tag -a v${IMAGE_TAG} -m "Release version ${IMAGE_TAG}"
                        git push origin v${IMAGE_TAG}
                    '''
                }
            }
        }
    }
}
