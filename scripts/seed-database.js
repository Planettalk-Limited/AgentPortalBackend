const { execSync } = require('child_process');
const path = require('path');

console.log('🌱 Starting database seeding...');
console.log('');

try {
  // Compile TypeScript first
  console.log('📦 Compiling TypeScript...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Run the seeder
  console.log('🌱 Running database seeder...');
  execSync('node dist/database/seeders/simple-seed.js', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Seeding failed:', error.message);
  process.exit(1);
}
