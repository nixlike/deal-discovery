const { Client } = require('pg');
const AWS = require('aws-sdk');

const location = new AWS.Location({ region: 'us-east-1' });

async function getAddressFromCoordinates(lat, lng) {
    try {
        const result = await Promise.race([
            location.searchPlaceIndexForPosition({
                IndexName: 'deal-discovery-geocoder',
                Position: [lng, lat]
            }).promise(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        if (result.Results && result.Results.length > 0) {
            return result.Results[0].Place.Label;
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
    }
    return `${lat}, ${lng}`;
}

exports.handler = async (event) => {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        const { httpMethod, path, queryStringParameters } = event;
        
        if (httpMethod === 'GET' && path === '/deals') {
            const limit = queryStringParameters?.limit || '50';
            const activeOnly = queryStringParameters?.active === 'true';
            
            let query = `
                SELECT id, business_name, deal_text, price, expires_at, 
                       latitude, longitude, created_at
                FROM deals
            `;
            
            if (activeOnly) {
                query += ' WHERE expires_at IS NULL OR expires_at > NOW()';
            }
            
            query += ' ORDER BY created_at DESC LIMIT $1';
            
            const result = await client.query(query, [limit]);
            
            // Add addresses to deals with timeout protection
            const dealsWithAddresses = await Promise.allSettled(
                result.rows.map(async (row) => {
                    const address = await getAddressFromCoordinates(
                        parseFloat(row.latitude), 
                        parseFloat(row.longitude)
                    );
                    
                    return {
                        id: row.id,
                        businessName: row.business_name,
                        dealText: row.deal_text,
                        price: parseFloat(row.price) || 0,
                        expiresAt: row.expires_at,
                        latitude: parseFloat(row.latitude) || 0,
                        longitude: parseFloat(row.longitude) || 0,
                        address: address,
                        createdAt: row.created_at
                    };
                })
            );
            
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    deals: dealsWithAddresses.map(result => 
                        result.status === 'fulfilled' ? result.value : {
                            error: 'Failed to process deal'
                        }
                    )
                })
            };
        }
        
        if (httpMethod === 'GET' && path.startsWith('/deals/')) {
            const dealId = path.split('/')[2];
            
            const result = await client.query(
                'SELECT * FROM deals WHERE id = $1',
                [dealId]
            );
            
            if (result.rows.length === 0) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Deal not found' })
                };
            }
            
            const row = result.rows[0];
            const address = await getAddressFromCoordinates(
                parseFloat(row.latitude), 
                parseFloat(row.longitude)
            );
            
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: row.id,
                    businessName: row.business_name,
                    dealText: row.deal_text,
                    price: parseFloat(row.price) || 0,
                    expiresAt: row.expires_at,
                    latitude: parseFloat(row.latitude) || 0,
                    longitude: parseFloat(row.longitude) || 0,
                    address: address,
                    createdAt: row.created_at
                })
            };
        }
        
        if (httpMethod === 'POST' && path === '/geocode') {
            const { address } = JSON.parse(event.body);
            
            try {
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
            } catch (error) {
                console.error('Geocoding error:', error);
            }
            
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Address not found' })
            };
        }
        
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Not found' })
        };
        
    } catch (error) {
        console.error('Database error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    } finally {
        await client.end();
    }
};
