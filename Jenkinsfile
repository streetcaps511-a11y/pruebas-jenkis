pipeline {
    agent any
    stages {
        stage('Install') {
            steps {
                dir('frontend') {
                    bat 'npm install'
                }
            }
        }
        stage('Install Playwright') {
            steps {
                bat 'npm install'
                bat 'npx playwright install --with-deps chromium'
            }
        }
        stage('Test') {
            steps {
                bat 'npx playwright test --project=chromium'
            }
        }
        stage('Build') {
            steps {
                dir('frontend') {
                    bat 'npm run build'
                }
            }
        }
    }
    post {
        always {
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright Report'
            ])
        }
    }
}