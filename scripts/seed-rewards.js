const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { RewardsSeeder } = require('../dist/database/seeders/rewards.seeder');

async function seedRewards() {
  console.log('🎁 Starting rewards seeding...');
  
  try {
    console.log('📦 Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn'],
    });
    
    console.log('🎯 Getting rewards seeder...');
    const seeder = app.get(RewardsSeeder);
    
    console.log('💰 Running rewards seeder...');
    await seeder.seedRewards();
    
    console.log('✅ Rewards seeding completed successfully!');
    await app.close();
    
  } catch (error) {
    console.error('❌ Rewards seeding failed:', error);
    process.exit(1);
  }
}

seedRewards();
