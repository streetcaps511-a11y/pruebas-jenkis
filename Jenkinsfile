pipeline {
    agent any
    stages {
        stage('Install') {
            steps {
                bat 'npm install'
            }
        }
        stage('Test') {
            steps {
                bat 'npm test -- --watchAll=false'
            }
        }
        stage('Build') {
            steps {
                bat 'npm run build'
            }
        }
    }
}