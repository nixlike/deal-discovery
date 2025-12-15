#!/bin/bash

set -e

echo "Packaging Lambda functions in /var/tmp..."

# Clean up any existing builds
rm -rf /var/tmp/lambda-build
mkdir -p /var/tmp/lambda-build

# Package photo-upload Lambda
echo "Packaging photo-upload Lambda..."
cp -r /home/cloudshell-user/ambitious/lambda/photo-upload /var/tmp/lambda-build/
cd /var/tmp/lambda-build/photo-upload
npm install --production
zip -r /var/tmp/photo-upload.zip . > /dev/null
cd /

# Package deals-api Lambda  
echo "Packaging deals-api Lambda..."
cp -r /home/cloudshell-user/ambitious/lambda/deals-api /var/tmp/lambda-build/
cd /var/tmp/lambda-build/deals-api
npm install --production
zip -r /var/tmp/deals-api.zip . > /dev/null
cd /

# Package deal-processor Lambda
echo "Packaging deal-processor Lambda..."
cp -r /home/cloudshell-user/ambitious/lambda/deal-processor /var/tmp/lambda-build/
cd /var/tmp/lambda-build/deal-processor
pip install -r requirements.txt -t . > /dev/null
zip -r /var/tmp/deal-processor.zip . > /dev/null
cd /

# Copy to project directory
cp /var/tmp/photo-upload.zip /home/cloudshell-user/ambitious/
cp /var/tmp/deals-api.zip /home/cloudshell-user/ambitious/
cp /var/tmp/deal-processor.zip /home/cloudshell-user/ambitious/

# Clean up
rm -rf /var/tmp/lambda-build

echo "Lambda packages created: photo-upload.zip, deals-api.zip, deal-processor.zip"
