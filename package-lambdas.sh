#!/bin/bash

echo "Packaging Lambda functions..."

# Package Node.js Lambdas
cd lambda/photo-upload
npm install --production
zip -r ../../photo-upload.zip .
cd ../..

cd lambda/deals-api
npm install --production
zip -r ../../deals-api.zip .
cd ../..

# Package Python Lambda
cd lambda/deal-processor
pip install -r requirements.txt -t .
zip -r ../../deal-processor.zip .
cd ../..

echo "Lambda packages created: photo-upload.zip, deals-api.zip, deal-processor.zip"
