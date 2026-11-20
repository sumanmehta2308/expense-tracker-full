
pipeline {
    agent any
    options 
    {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 15, unit: 'MINUTES')
    }
    stages {
        stage('Checkout') {
            steps {
                echo 'Getting latest code from GitHub'
                checkout scm
            }
        }
        stage('Install Dependencies') {
            steps {
                dir('Backend') {
                    sh 'npm ci --omit=dev'
                }
            }
        }
       stage('Deploy Application') {
    steps {
        sh '''
            cd /home/ec2-user/expense-tracker-full
            git pull origin main
            cd Backend
            npm ci --omit=dev
            pm2 reload expense-backend
            cd ../Frontend
            npm ci
            npm run build
        '''
    }
}
        stage('Verify Deployment') {
            steps {
                sh 'pm2 status expense-backend'
            }
        }
    }
    post {
        success {
            echo 'Expense Tracker deployed successfully!'
        }
        failure {
            echo 'Deployment failed. Check Jenkins console output.'
        }
    }
}
