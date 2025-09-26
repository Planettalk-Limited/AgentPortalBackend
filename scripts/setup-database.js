#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Agent Portal Database Setup');
console.log('================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('📋 Creating .env from env.example...');
  
  const examplePath = path.join(__dirname, '..', 'env.example');
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('✅ .env file created successfully!');
    console.log('⚠️  Please update your database credentials in .env file\n');
  } else {
    console.log('❌ env.example not found!');
    process.exit(1);
  }
}

// Load environment variables
require('dotenv').config({ path: envPath });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'agent_portal'
};

console.log('📊 Database Configuration:');
console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
console.log(`   User: ${dbConfig.username}`);
console.log(`   Database: ${dbConfig.database}\n`);

try {
  console.log('🔍 Checking PostgreSQL connection...');
  
  // Test connection to PostgreSQL server (not the specific database)
  execSync(`psql -U ${dbConfig.username} -h ${dbConfig.host} -p ${dbConfig.port} -d postgres -c "SELECT 1;" > nul 2>&1`, { 
    stdio: 'pipe',
    env: { ...process.env, PGPASSWORD: dbConfig.password }
  });
  
  console.log('✅ PostgreSQL connection successful!');
  
  console.log('🗄️  Creating database...');
  
  // Create the database
  execSync(`psql -U ${dbConfig.username} -h ${dbConfig.host} -p ${dbConfig.port} -d postgres -c "CREATE DATABASE ${dbConfig.database};" > nul 2>&1`, {
    stdio: 'pipe',
    env: { ...process.env, PGPASSWORD: dbConfig.password }
  });
  
  console.log('✅ Database created successfully!');
  
} catch (error) {
  if (error.message.includes('already exists')) {
    console.log('ℹ️  Database already exists, skipping creation...');
  } else {
    console.log('❌ Failed to create database:');
    console.log('   Make sure PostgreSQL is running and credentials are correct');
    console.log('   You can manually create the database using:');
    console.log(`   psql -U ${dbConfig.username} -h ${dbConfig.host} -c "CREATE DATABASE ${dbConfig.database};"`);
    console.log('\n💡 Tips:');
    console.log('   - Check your PostgreSQL service is running');
    console.log('   - Verify credentials in .env file');
    console.log('   - Ensure user has CREATE DATABASE permissions\n');
    process.exit(1);
  }
}

try {
  console.log('📋 Running migrations...');
  execSync('npm run migration:run', { stdio: 'inherit' });
  console.log('✅ Migrations completed successfully!');
  
} catch (error) {
  console.log('⚠️  Migration failed. You may need to generate migrations first:');
  console.log('   npm run migration:generate src/migrations/InitialSetup');
  console.log('   npm run migration:run');
}

console.log('\n🎉 Database setup complete!');
console.log('🚀 You can now start the application with: npm run start:dev');
