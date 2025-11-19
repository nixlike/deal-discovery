-- Deal Discovery App Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Deals table with expiration date support
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    deal_text TEXT NOT NULL,
    price DECIMAL(10,2),
    expires_at TIMESTAMP WITH TIME ZONE,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for location-based queries
CREATE INDEX idx_deals_location ON deals (latitude, longitude);

-- Index for expiration date queries
CREATE INDEX idx_deals_expires_at ON deals (expires_at);

-- Index for active deals (not expired)
CREATE INDEX idx_deals_active ON deals (expires_at) WHERE expires_at IS NULL OR expires_at > NOW();

-- Index for photo lookup
CREATE INDEX idx_deals_photo_id ON deals (photo_id);

-- View for active deals only
CREATE VIEW active_deals AS
SELECT * FROM deals 
WHERE expires_at IS NULL OR expires_at > NOW();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_deals_updated_at 
    BEFORE UPDATE ON deals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
