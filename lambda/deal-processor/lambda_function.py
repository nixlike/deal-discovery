import json
import os
import re
from datetime import datetime
import pg8000

def lambda_handler(event, context):
    print("Processing deal extraction...")
    
    # Database connection parameters
    db_config = {
        'host': os.environ['DB_HOST'],
        'port': int(os.environ['DB_PORT']),
        'database': os.environ['DB_NAME'],
        'user': os.environ['DB_USER'],
        'password': os.environ['DB_PASSWORD'],
        'ssl_context': True
    }
    
    try:
        # Connect to database
        conn = pg8000.connect(**db_config)
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS deals (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                photo_id VARCHAR(255) NOT NULL,
                business_name VARCHAR(255),
                deal_text TEXT NOT NULL,
                price DECIMAL(10,2),
                expires_at TIMESTAMP WITH TIME ZONE,
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        
        # Process each record from SQS
        for record in event['Records']:
            message_body = json.loads(record['body'])
            photo_id = message_body.get('photoId')
            detected_text = message_body.get('detectedText', '')
            location = message_body.get('location')
            
            print(f"Processing photo {photo_id}")
            
            # Extract business names, prices, and expiration dates
            business_names = extract_business_names(detected_text)
            prices = extract_prices(detected_text)
            expiration_dates = extract_expiration_dates(detected_text)
            
            # Use fallback coordinates if no location provided
            if not location:
                location = {
                    'latitude': 37.89197,
                    'longitude': -76.44494
                }
            
            # Insert deal into database
            cursor.execute("""
                INSERT INTO deals (photo_id, business_name, price, expires_at, 
                                 deal_text, latitude, longitude, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                photo_id,
                business_names[0] if business_names else None,
                prices[0] if prices else None,
                expiration_dates[0] if expiration_dates else None,
                detected_text,
                location['latitude'] if location else None,
                location['longitude'] if location else None,
                datetime.utcnow()
            ))
            
            print(f"Successfully processed photo {photo_id}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'body': json.dumps('Success')
        }
        
    except Exception as e:
        print(f"Error processing deals: {str(e)}")
        raise e

def extract_business_names(text):
    lines = text.split('\n')
    business_names = []
    for line in lines[:3]:
        if len(line.strip()) > 3 and not re.search(r'\d+\.\d+', line):
            business_names.append(line.strip())
    return business_names

def extract_prices(text):
    price_pattern = r'\$\d+\.\d{2}'
    return re.findall(price_pattern, text)

def extract_expiration_dates(text):
    date_patterns = [
        r'\d{1,2}/\d{1,2}/\d{4}',
        r'\d{1,2}-\d{1,2}-\d{4}',
        r'expires?\s+\d{1,2}/\d{1,2}',
        r'valid\s+until\s+\d{1,2}/\d{1,2}'
    ]
    
    dates = []
    for pattern in date_patterns:
        dates.extend(re.findall(pattern, text, re.IGNORECASE))
    return dates
