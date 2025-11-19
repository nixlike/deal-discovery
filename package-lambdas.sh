#!/bin/bash

echo "Packaging Lambda functions..."

# Package Node.js Lambda
cd lambda/photo-upload
npm install --production
zip -r ../../photo-upload.zip .
cd ../..

# Package Deals API Lambda
cd lambda/deals-api
npm install --production
zip -r ../../deals-api.zip .
cd ../..

# Package Go Lambda
cd lambda/deal-processor
GOOS=linux GOARCH=amd64 go build -o main main.go
zip -r ../../deal-processor.zip main
cd ../..

echo "Lambda packages created: photo-upload.zip, deals-api.zip, deal-processor.zip"
