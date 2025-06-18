// Jenkinsfile
pipeline {
    agent any

    environment {
        AWS_ACCOUNT_ID     = '889818960214'
        AWS_REGION         = 'us-west-2'
        AWS_CREDENTIALS_ID = 'aws-credentials'
        SONARQUBE_URL      = 'http://35.164.90.24:9000' // Make sure this is correct
        SONAR_CREDENTIALS_ID = 'SonarQube'
        ECR_REGISTRY       = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        FRONTEND_IMAGE_NAME= 'frontend-app'
        BACKEND_IMAGE_NAME = 'backend-app'
        IMAGE_TAG          = "build-${env.BUILD_NUMBER}"
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
                    // This stage will scan both frontend and backend code
                    // Ensure your SonarQube project is configured to scan both
                    def scannerHome = tool 'SonarQubeScanner';
                    withSonarQubeEnv('sonarqube') { // 'sonarqube' should match your Jenkins system config name
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                // This will wait for SonarQube analysis to complete and check the Quality Gate status
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build, Scan & Push Backend') {
            steps {
                script {
                    dir('backend') {
                        def backendImage = "${ECR_REGISTRY}/${BACKEND_IMAGE_NAME}:${IMAGE_TAG}"

                        // Build the Docker image
                        echo "Building backend Docker image: ${backendImage}"
                        sh "docker build -t ${backendImage} ."

                        // Scan the image with Trivy
                        echo "Scanning backend Docker image with Trivy"
                        sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${backendImage}"

                        // Push to ECR
                        echo "Pushing backend Docker image to ECR"
                        withAWS(credentials: AWS_CREDENTIALS_ID, region: AWS_REGION) {
                            sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"
                            sh "docker push ${backendImage}"
                        }
                    }
                }
            }
        }

        stage('Build, Scan & Push Frontend') {
            steps {
                script {
                    dir('frontend') {
                        def frontendImage = "${ECR_REGISTRY}/${FRONTEND_IMAGE_NAME}:${IMAGE_TAG}"

                        // Build the Docker image
                        echo "Building frontend Docker image: ${frontendImage}"
                        sh "docker build -t ${frontendImage} ."

                        // Scan the image with Trivy
                        echo "Scanning frontend Docker image with Trivy"
                        sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${frontendImage}"

                        // Push to ECR
                        echo "Pushing frontend Docker image to ECR"
                        withAWS(credentials: AWS_CREDENTIALS_ID, region: AWS_REGION) {
                            // The login from the previous stage might still be valid, but re-authenticating is safer
                            sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"
                            sh "docker push ${frontendImage}"
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo 'Pipeline finished.'
            cleanWs() // Clean up the workspace
        }
    }
}
