#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
GITHUB_OWNER=${3}
GITHUB_REPO=${4}
GITHUB_TOKEN=${5}

echo "Deploying Deal Discovery App to $ENVIRONMENT environment in $REGION"

# Deploy main infrastructure
echo "Deploying main infrastructure..."
aws cloudformation deploy \
  --template-file infrastructure/main.yaml \
  --stack-name deal-discovery-main-$ENVIRONMENT \
  --parameter-overrides Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_IAM \
  --region $REGION

# Get outputs from main stack
PHOTO_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name deal-discovery-main-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`PhotoBucketName`].OutputValue' \
  --output text --region $REGION)

PROCESSING_QUEUE_URL=$(aws cloudformation describe-stacks \
  --stack-name deal-discovery-main-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`ProcessingQueueUrl`].OutputValue' \
  --output text --region $REGION)

DATABASE_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name deal-discovery-main-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
  --output text --region $REGION)

# Deploy API and Lambda functions
echo "Deploying API Gateway and Lambda functions..."
aws cloudformation deploy \
  --template-file infrastructure/api.yaml \
  --stack-name deal-discovery-api-$ENVIRONMENT \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    PhotoBucket=$PHOTO_BUCKET \
    ProcessingQueueUrl=$PROCESSING_QUEUE_URL \
    DatabaseEndpoint=$DATABASE_ENDPOINT \
    LambdaExecutionRoleArn=$(aws cloudformation describe-stacks \
      --stack-name deal-discovery-main-$ENVIRONMENT \
      --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' \
      --output text --region $REGION) \
  --capabilities CAPABILITY_IAM \
  --region $REGION

# Deploy CodePipeline (if GitHub parameters provided)
if [ ! -z "$GITHUB_OWNER" ] && [ ! -z "$GITHUB_REPO" ] && [ ! -z "$GITHUB_TOKEN" ]; then
  echo "Deploying CodePipeline..."
  aws cloudformation deploy \
    --template-file infrastructure/pipeline.yaml \
    --stack-name deal-discovery-pipeline-$ENVIRONMENT \
    --parameter-overrides \
      GitHubOwner=$GITHUB_OWNER \
      GitHubRepo=$GITHUB_REPO \
      GitHubToken=$GITHUB_TOKEN \
    --capabilities CAPABILITY_IAM \
    --region $REGION
fi

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name deal-discovery-api-$ENVIRONMENT \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text --region $REGION)

echo "Deployment complete!"
echo "API Endpoint: $API_ENDPOINT"
echo "Photo Bucket: $PHOTO_BUCKET"
