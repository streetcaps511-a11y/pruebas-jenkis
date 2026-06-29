pipeline {
    agent any
    stages {
        stage('Install Frontend') {
            steps {
                dir('frontend') {
                    bat 'npm install'
                }
            }
        }
        stage('Install Backend') {
            steps {
                dir('backend') {
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
                bat '''
                    start /B cmd /c "cd backend && npm start"
                    timeout /t 10
                    npx playwright test --project=chromium
                '''
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