#!/bin/bash

set -e

echo "Packaging Lambda functions in /tmp..."

# Clean up any existing builds
rm -rf /tmp/lambda-build
mkdir -p /tmp/lambda-build

# Package photo-upload Lambda
echo "Packaging photo-upload Lambda..."
cp -r /home/cloudshell-user/ambitious/lambda/photo-upload /tmp/lambda-build/
cd /tmp/lambda-build/photo-upload
npm install --production
zip -r /tmp/photo-upload.zip . > /dev/null
cd /

# Package deals-api Lambda  
echo "Packaging deals-api Lambda..."
cp -r /home/cloudshell-user/ambitious/lambda/deals-api /tmp/lambda-build/
cd /tmp/lambda-build/deals-api
npm install --production
zip -r /tmp/deals-api.zip . > /dev/null
cd /

# Package deal-processor Lambda
echo "Packaging deal-processor Lambda..."
cp -r /home/cloudshell-user/ambitious/lambda/deal-processor /tmp/lambda-build/
cd /tmp/lambda-build/deal-processor
pip install -r requirements.txt -t . > /dev/null
zip -r /tmp/deal-processor.zip . > /dev/null
cd /

# Copy to project directory
cp /tmp/photo-upload.zip /home/cloudshell-user/ambitious/
cp /tmp/deals-api.zip /home/cloudshell-user/ambitious/
cp /tmp/deal-processor.zip /home/cloudshell-user/ambitious/

# Clean up
rm -rf /tmp/lambda-build

echo "Lambda packages created: photo-upload.zip, deals-api.zip, deal-processor.zip"
