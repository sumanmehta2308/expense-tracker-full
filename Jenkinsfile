pipeline {
    agent any

    options {
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
        stage('Deploy Application') {
            steps {
                sh '''
                    sudo -u ec2-user bash -c '
                        cd /home/ec2-user/expense-tracker-full
                        git pull origin main
                        cd Backend
                        npm install --omit=dev
                        pm2 reload expense-backend --update-env
                        cd ../Frontend
                        npm install
                        npm run build
                    '
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh 'sudo -u ec2-user pm2 status expense-backend'
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