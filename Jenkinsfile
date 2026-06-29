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
                bat 'npx playwright install --with-deps chromium'
            }
        }
        stage('Test') {
            steps {
                withCredentials([file(credentialsId: 'backend-env-file', variable: 'BACKEND_ENV')]) {
                    bat 'copy %BACKEND_ENV% backend\\.env'
                }
                bat 'start /B cmd /c "cd backend && npm start > backend.log 2>&1"'
                bat 'ping -n 15 127.0.0.1 > nul'
                bat 'npx playwright test --project=chromium'
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
            node('built-in') {
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
}