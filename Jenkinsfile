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
        stage('Test') {
            steps {
                dir('frontend') {
                    bat 'npm test'
                }
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
}