-- Initial database setup script
-- This script runs when the PostgreSQL container is first created

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- You can add any initial data or additional setup here
-- For example, creating initial admin user (will be handled by migrations)

-- Set timezone
SET timezone = 'UTC';
