name: Deploy to Elastic Beanstalk

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: |
        npm install

    - name: Build server
      run: |
        # compile TypeScript from server/
        npm run build:server

    - name: Build client
      run: |
        # compile vite client build in dist/
        npm run build:client

    - name: Create deployment package
      run: |
        mkdir -p eb-package

        # Copy server build
        cp -r server/dist eb-package/server/dist

        # Copy client build
        cp -r dist eb-package/dist

        # Copy main files
        cp package.json eb-package/
        cp package-lock.json eb-package/ || true
        cp Procfile eb-package/

        cd eb-package
        zip -r ../deploy.zip . -x "*.git*" "node_modules/*"

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1

    - name: Deploy to Elastic Beanstalk
      uses: einaregilsson/beanstalk-deploy@v21
      with:
        aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        application_name: FreemindVisionApp
        environment_name: FreemindVisionApp-env
        version_label: ${{ github.sha }}
        region: us-east-1
        deployment_package: deploy.zip
