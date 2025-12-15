#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "🚀 Deploying frontend for environment: $ENVIRONMENT in region: $REGION"

# Deploy CloudFormation stack
echo "📦 Deploying S3 bucket..."
aws cloudformation deploy \
  --template-file infrastructure/frontend.yaml \
  --stack-name "deal-discovery-frontend-$ENVIRONMENT" \
  --parameter-overrides Environment=$ENVIRONMENT \
  --region $REGION

# Get bucket name from stack outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name "deal-discovery-frontend-$ENVIRONMENT" \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

echo "📁 Bucket name: $BUCKET_NAME"

# Build frontend in /tmp to save space
echo "🔨 Building Next.js app in /tmp..."
BUILD_DIR="/tmp/frontend-build-$$"
cp -r frontend "$BUILD_DIR"
cd "$BUILD_DIR"

# Set npm cache to /tmp
export npm_config_cache="/tmp/.npm-cache-$$"
npm install
npm run build

# Deploy to S3 - check both possible output directories
if [ -d "out" ]; then
  echo "📤 Uploading from out/ directory..."
  aws s3 sync out/ s3://$BUCKET_NAME --delete --region $REGION
elif [ -d ".next" ]; then
  echo "📤 Uploading from .next/ directory..."
  aws s3 sync .next/ s3://$BUCKET_NAME --delete --region $REGION
else
  echo "❌ No build output directory found!"
  ls -la
  exit 1
fi

# Clean up
cd /
rm -rf "$BUILD_DIR"
rm -rf "/tmp/.npm-cache-$$"

# Get website URL
WEBSITE_URL=$(aws cloudformation describe-stacks \
  --stack-name "deal-discovery-frontend-$ENVIRONMENT" \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
  --output text)

echo "✅ Frontend deployed successfully!"
echo "🌐 Website URL: $WEBSITE_URL"
