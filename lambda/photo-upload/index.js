const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const ExifReader = require('exifreader');

const s3 = new AWS.S3();
const sqs = new AWS.SQS();
const rekognition = new AWS.Rekognition();
const location = new AWS.Location({ region: 'us-east-1' });

const BUCKET_NAME = process.env.PHOTO_BUCKET;
const QUEUE_URL = process.env.PROCESSING_QUEUE_URL;

exports.handler = async (event) => {
    
    // Handle geocoding requests
    if (event.httpMethod === 'POST' && event.path === '/geocode') {
        try {
            const { address } = JSON.parse(event.body);
            
            const result = await location.searchPlaceIndexForText({
                IndexName: 'deal-discovery-geocoder',
                Text: address
            }).promise();
            
            
            if (result.Results && result.Results.length > 0) {
                const [longitude, latitude] = result.Results[0].Place.Geometry.Point;
                return {
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ latitude, longitude })
                };
            }
            
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Address not found' })
            };
        } catch (error) {
            console.error('Geocoding error:', error);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Geocoding failed', details: error.message })
            };
        }
    }

    // Handle photo uploads (existing logic)
    try {
        const { photo, metadata } = JSON.parse(event.body);
        
        if (!photo) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST'
                },
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

        // Extract location from EXIF GPS data first, then fallback
        let location = null;
        try {
            const exifData = ExifReader.load(photoBuffer);
            if (exifData.GPSLatitude && exifData.GPSLongitude) {
                let latitude = parseFloat(exifData.GPSLatitude.description);
                let longitude = parseFloat(exifData.GPSLongitude.description);
                
                // Check GPS reference to determine sign
                if (exifData.GPSLatitudeRef && exifData.GPSLatitudeRef.value[0] === 'S') {
                    latitude = -latitude;
                }
                if (exifData.GPSLongitudeRef && exifData.GPSLongitudeRef.value[0] === 'W') {
                    longitude = -longitude;
                }
                
                location = { latitude, longitude };
            }
        } catch (exifError) {
        }
        
        // Use fallback coordinates if no EXIF GPS data
        if (!location) {
            location = {
                latitude: 37.89197,
                longitude: -76.44494
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
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
