const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3();
const sqs = new AWS.SQS();
const rekognition = new AWS.Rekognition();

const BUCKET_NAME = process.env.PHOTO_BUCKET;
const QUEUE_URL = process.env.PROCESSING_QUEUE_URL;

exports.handler = async (event) => {
    try {
        const { photo, metadata } = JSON.parse(event.body);
        
        if (!photo) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Photo data required' })
            };
        }

        const photoId = uuidv4();
        const photoKey = `photos/${photoId}.jpg`;
        
        // Decode base64 photo
        const photoBuffer = Buffer.from(photo, 'base64');
        
        // Upload to S3
        await s3.putObject({
            Bucket: BUCKET_NAME,
            Key: photoKey,
            Body: photoBuffer,
            ContentType: 'image/jpeg'
        }).promise();

        // Extract location from EXIF if available
        let location = null;
        if (metadata && metadata.location) {
            location = {
                latitude: metadata.location.latitude,
                longitude: metadata.location.longitude
            };
        }

        // Use Rekognition to detect text in image
        const textDetection = await rekognition.detectText({
            Image: {
                S3Object: {
                    Bucket: BUCKET_NAME,
                    Name: photoKey
                }
            }
        }).promise();

        // Extract detected text
        const detectedText = textDetection.TextDetections
            .filter(detection => detection.Type === 'LINE')
            .map(detection => detection.DetectedText)
            .join(' ');

        // Send processing message to SQS
        const processingMessage = {
            photoId,
            photoKey,
            location,
            detectedText,
            timestamp: new Date().toISOString()
        };

        await sqs.sendMessage({
            QueueUrl: QUEUE_URL,
            MessageBody: JSON.stringify(processingMessage)
        }).promise();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({
                photoId,
                message: 'Photo uploaded and queued for processing'
            })
        };

    } catch (error) {
        console.error('Error processing photo:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
