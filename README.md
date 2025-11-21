# Deal Discovery App

Photo-based deal discovery app with location extraction and expiration date detection.

## Architecture

- **API Gateway + Lambda**: Photo upload and processing
- **S3**: Photo storage
- **Rekognition**: Text extraction from images
- **RDS PostgreSQL**: Deal data storage
- **SQS**: Async processing queue

## Deployment

### Prerequisites
- AWS CLI configured
- Node.js 18+
- Python 3.9+

### Quick Deploy
```bash
./deploy.sh dev us-east-1
```

### With CodePipeline (Release Triggered)
The CodePipeline automatically deploys when a GitHub release is created:
```bash
./deploy.sh dev us-east-1 your-github-username repo-name github-token
```

Create a release on GitHub to trigger automatic Lambda function updates.

### Manual Steps
1. Package Lambda functions:
   ```bash
   ./package-lambdas.sh
   ```

2. Deploy infrastructure:
   ```bash
   aws cloudformation deploy --template-file infrastructure/main.yaml --stack-name deal-discovery-main-dev --capabilities CAPABILITY_IAM
   ```

3. Deploy API:
   ```bash
   aws cloudformation deploy --template-file infrastructure/api.yaml --stack-name deal-discovery-api-dev --capabilities CAPABILITY_IAM
   ```

## API Usage

### Upload Photo
```bash
curl -X POST https://your-api-endpoint/dev/photo \
  -H "Content-Type: application/json" \
  -d '{
    "photo": "base64-encoded-image",
    "metadata": {
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060
      }
    }
  }'
```

## Features Extracted

- **Business names** from image text
- **Prices** ($X.XX format)
- **Expiration dates** (multiple formats)
- **GPS location** from EXIF data
- **Full deal text** for context
