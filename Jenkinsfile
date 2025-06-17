pipeline {
    agent any
    
    environment {
        AWS_DEFAULT_REGION = 'us-west-2'
        AWS_ACCOUNT_ID = '889818960214'
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
        FRONTEND_REPO = 'my-app-frontend'
        BACKEND_REPO = 'my-app-backend'
        SONAR_PROJECT_KEY = 'my-fullstack-app'
        TRIVY_VERSION = 'latest'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                script {
                    withSonarQubeEnv('SonarQube') {
                        sh '''
                            sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.sources=. \
                                -Dsonar.exclusions=**/node_modules/**,**/target/**,**/*.jar \
                                -Dsonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info \
                                -Dsonar.coverage.exclusions=**/*.spec.js,**/*.test.js
                        '''
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        
        stage('Install Dependencies') {
            parallel {
                stage('Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            sh 'npm install'
                            sh 'npm run test -- --coverage --watchAll=false'
                        }
                    }
                }
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            sh 'npm install'
                            sh 'npm test'
                        }
                    }
                }
            }
        }
        
        stage('Build Docker Images') {
            parallel {
                stage('Build Frontend') {
                    steps {
                        script {
                            dir('frontend') {
                                sh """
                                    docker build -t ${FRONTEND_REPO}:${BUILD_NUMBER} .
                                    docker tag ${FRONTEND_REPO}:${BUILD_NUMBER} ${ECR_REGISTRY}/${FRONTEND_REPO}:${BUILD_NUMBER}
                                    docker tag ${FRONTEND_REPO}:${BUILD_NUMBER} ${ECR_REGISTRY}/${FRONTEND_REPO}:latest
                                """
                            }
                        }
                    }
                }
                stage('Build Backend') {
                    steps {
                        script {
                            dir('backend') {
                                sh """
                                    docker build -t ${BACKEND_REPO}:${BUILD_NUMBER} .
                                    docker tag ${BACKEND_REPO}:${BUILD_NUMBER} ${ECR_REGISTRY}/${BACKEND_REPO}:${BUILD_NUMBER}
                                    docker tag ${BACKEND_REPO}:${BUILD_NUMBER} ${ECR_REGISTRY}/${BACKEND_REPO}:latest
                                """
                            }
                        }
                    }
                }
            }
        }
        
        stage('Security Scan with Trivy') {
            parallel {
                stage('Scan Frontend') {
                    steps {
                        sh """
                            trivy image --format json --output frontend-scan.json ${FRONTEND_REPO}:${BUILD_NUMBER}
                            trivy image --severity HIGH,CRITICAL --exit-code 1 ${FRONTEND_REPO}:${BUILD_NUMBER}
                        """
                        archiveArtifacts artifacts: 'frontend-scan.json', fingerprint: true
                    }
                }
                stage('Scan Backend') {
                    steps {
                        sh """
                            trivy image --format json --output backend-scan.json ${BACKEND_REPO}:${BUILD_NUMBER}
                            trivy image --severity HIGH,CRITICAL --exit-code 1 ${BACKEND_REPO}:${BUILD_NUMBER}
                        """
                        archiveArtifacts artifacts: 'backend-scan.json', fingerprint: true
                    }
                }
            }
        }
        
        stage('Push to ECR') {
            steps {
                withCredentials([aws(credentialsId: 'aws-credentials', region: "${AWS_DEFAULT_REGION}")]) {
                    script {
                        sh """
                            # Login to ECR
                            aws ecr get-login-password --region ${AWS_DEFAULT_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                            
                            # Create repositories if they don't exist
                            aws ecr describe-repositories --repository-names ${FRONTEND_REPO} || aws ecr create-repository --repository-name ${FRONTEND_REPO}
                            aws ecr describe-repositories --repository-names ${BACKEND_REPO} || aws ecr create-repository --repository-name ${BACKEND_REPO}
                            
                            # Push images
                            docker push ${ECR_REGISTRY}/${FRONTEND_REPO}:${BUILD_NUMBER}
                            docker push ${ECR_REGISTRY}/${FRONTEND_REPO}:latest
                            docker push ${ECR_REGISTRY}/${BACKEND_REPO}:${BUILD_NUMBER}
                            docker push ${ECR_REGISTRY}/${BACKEND_REPO}:latest
                        """
                    }
                }
            }
        }
        
        stage('Deploy with Ansible') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'develop'
                }
            }
            steps {
                withCredentials([aws(credentialsId: 'aws-credentials', region: "${AWS_DEFAULT_REGION}")]) {
                    script {
                        sh """
                            ansible-playbook -i k8s/inventory k8s/deploy.yml \
                                -e frontend_image=${ECR_REGISTRY}/${FRONTEND_REPO}:${BUILD_NUMBER} \
                                -e backend_image=${ECR_REGISTRY}/${BACKEND_REPO}:${BUILD_NUMBER} \
                                -e build_number=${BUILD_NUMBER}
                        """
                    }
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
            sh 'docker system prune -f'
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
