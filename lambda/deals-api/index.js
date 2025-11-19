const { Client } = require('pg');

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

exports.handler = async (event) => {
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
            
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    deals: result.rows.map(row => ({
                        id: row.id,
                        businessName: row.business_name,
                        dealText: row.deal_text,
                        price: parseFloat(row.price) || 0,
                        expiresAt: row.expires_at,
                        latitude: parseFloat(row.latitude) || 0,
                        longitude: parseFloat(row.longitude) || 0,
                        createdAt: row.created_at
                    }))
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
                    createdAt: row.created_at
                })
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
