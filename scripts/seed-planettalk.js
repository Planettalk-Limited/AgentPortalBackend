const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { PlanetTalkSeeder } = require('../dist/database/seeders/planettalk.seeder');

async function seedPlanetTalk() {
  console.log('🌍 Starting PlanetTalk Agent Portal seeding...');
  
  try {
    console.log('📦 Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn'],
    });
    
    console.log('🎯 Getting PlanetTalk seeder...');
    const seeder = app.get(PlanetTalkSeeder);
    
    console.log('📱 Running PlanetTalk seeder...');
    await seeder.seed();
    
    console.log('✅ PlanetTalk seeding completed successfully!');
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('   Admin: admin@planettalk.com / admin123');
    console.log('   PT Admin: maria.santos@planettalk.com / ptadmin123');
    console.log('   Agent 1: kwame.asante@example.com / agent123 (Ghanaian → London)');
    console.log('   Agent 2: amara.okafor@example.com / agent123 (Nigerian → Houston)');
    console.log('   Agent 3: thandiwe.moyo@example.com / agent123 (Zimbabwean → Toronto)');
    console.log('   Agent 4: grace.wanjiku@example.com / agent123 (Kenyan → Boston)');
    console.log('');
    console.log('📱 Test referral codes:');
    console.log('   DIASPORA2024 - Diaspora Community Special');
    console.log('   FAMILYFIRST - Family First VIP Services');
    console.log('   HOMECONNECT - Home Connect Standard');
    console.log('   AFRICANPRIDE - African Pride Promotion');
    console.log('');
    console.log('🌍 PlanetTalk Agent Portal ready for diaspora community!');
    
    await app.close();
    
  } catch (error) {
    console.error('❌ PlanetTalk seeding failed:', error);
    process.exit(1);
  }
}

seedPlanetTalk();
