pipeline {
    agent any
    stages {
        stage('Install Frontend') {
            steps {
                dir('frontend') { bat 'npm install' }
            }
        }
        stage('Install Backend') {
            steps {
                dir('backend') { bat 'npm install' }
            }
        }
        stage('Install Playwright') {
            steps {
                bat 'npm install'
                bat 'npx playwright install'
            }
        }
        stage('Test') {
            steps {
                withCredentials([file(credentialsId: 'e1b4792d-474c-47d1-b018-64270bb40399', variable: 'BACKEND_ENV')]) {
                    bat 'copy %BACKEND_ENV% backend\\.env'
                }
                bat 'start /B cmd /c "cd backend && npm start > backend.log 2>&1"'
                bat 'ping -n 30 127.0.0.1 > nul'
                bat 'npx playwright test'
            }
        }
        stage('Build') {
            steps {
                dir('frontend') { bat 'npm run build' }
            }
        }
    }
    post {
        always {
            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: "${WORKSPACE}/playwright-report",
                reportFiles: 'index.html',
                reportName: 'Playwright Report'
            ])
        }
    }
}