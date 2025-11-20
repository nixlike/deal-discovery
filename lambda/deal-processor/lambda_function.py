import json
import re
import psycopg2
from datetime import datetime
import os

def lambda_handler(event, context):
    conn = psycopg2.connect(
        host=os.environ['DB_HOST'],
        port=os.environ['DB_PORT'],
        database=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD']
    )
    
    try:
        cur = conn.cursor()
        
        for record in event['Records']:
            message = json.loads(record['body'])
            deal = process_deal(message)
            save_deal(cur, deal)
            print(f"Successfully processed deal for photo {message['photoId']}")
        
        conn.commit()
        
    except Exception as e:
        print(f"Error processing deals: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def process_deal(message):
    deal = {
        'photo_id': message['photoId'],
        'timestamp': message['timestamp'],
        'latitude': message.get('location', {}).get('latitude', 0),
        'longitude': message.get('location', {}).get('longitude', 0)
    }
    
    text = message['detectedText']
    
    # Extract price
    price_match = re.search(r'\$(\d+(?:\.\d{2})?)', text.lower())
    deal['price'] = float(price_match.group(1)) if price_match else 0
    
    # Extract business name
    business_match = re.search(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', text)
    deal['business_name'] = business_match.group(1) if business_match else None
    
    # Extract expiration date
    deal['expires_at'] = extract_expiration_date(text)
    deal['deal_text'] = text
    
    return deal

def extract_expiration_date(text):
    patterns = [
        r'(?i)exp(?:ires?)?\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
        r'(?i)valid\s+until\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
        r'(?i)good\s+through\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
        r'(?i)(?:offer\s+)?ends?\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
        r'(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            date_str = match.group(1)
            try:
                # Try different date formats
                for fmt in ['%m/%d/%Y', '%m/%d/%y', '%m-%d-%Y', '%m-%d-%y']:
                    try:
                        date_obj = datetime.strptime(date_str, fmt)
                        # If 2-digit year < 50, assume 20xx
                        if date_obj.year < 1950:
                            date_obj = date_obj.replace(year=date_obj.year + 100)
                        return date_obj.isoformat()
                    except ValueError:
                        continue
            except:
                continue
    
    return None

def save_deal(cursor, deal):
    query = """
        INSERT INTO deals (photo_id, business_name, deal_text, price, expires_at, latitude, longitude, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    
    cursor.execute(query, (
        deal['photo_id'],
        deal['business_name'],
        deal['deal_text'],
        deal['price'],
        deal['expires_at'],
        deal['latitude'],
        deal['longitude'],
        deal['timestamp']
    ))
    
    return cursor.fetchone()[0]
