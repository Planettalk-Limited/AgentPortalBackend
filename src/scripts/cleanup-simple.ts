import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { AgentsService } from '../modules/agents/agents.service';
import { User, UserRole, UserStatus } from '../modules/users/entities/user.entity';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

async function cleanupAndReset() {
  console.log('🚀 Starting database cleanup and reset...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Quick cleanup using raw queries for speed
    await dataSource.query('DELETE FROM agent_earnings');
    await dataSource.query('DELETE FROM payouts');
    await dataSource.query('DELETE FROM referral_usages');
    await dataSource.query('DELETE FROM referral_codes');
    await dataSource.query('DELETE FROM agent_applications');
    await dataSource.query('DELETE FROM agents');
    await dataSource.query('DELETE FROM notifications');
    await dataSource.query('DELETE FROM users');

    console.log('✅ All data cleared');

    // Create admin users
    const adminPassword = await bcrypt.hash('admin123!', 10);
    const ptAdminPassword = await bcrypt.hash('ptadmin123!', 10);
    
    // Create System Admin
    await dataSource.query(`
      INSERT INTO users (id, "firstName", "lastName", email, username, "passwordHash", role, status, "isFirstLogin", "emailVerifiedAt", metadata, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        'System',
        'Administrator', 
        'admin@planettalk.com',
        'admin@planettalk.com',
        $1,
        'admin',
        'active',
        false,
        NOW(),
        '{"createdBy": "cleanup-script", "isTestAdmin": true}',
        NOW(),
        NOW()
      )
    `, [adminPassword]);

    // Create PT Admin
    await dataSource.query(`
      INSERT INTO users (id, "firstName", "lastName", email, username, "passwordHash", role, status, "isFirstLogin", "emailVerifiedAt", metadata, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        'PlanetTalk',
        'Admin', 
        'ptadmin@planettalk.com',
        'ptadmin@planettalk.com',
        $1,
        'pt_admin',
        'active',
        false,
        NOW(),
        '{"createdBy": "cleanup-script", "isPTAdmin": true}',
        NOW(),
        NOW()
      )
    `, [ptAdminPassword]);

    console.log('✅ Admin users created');
    console.log('');
    console.log('🎉 Database reset complete!');
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('');
    console.log('   📊 System Admin:');
    console.log('      Email: admin@planettalk.com');
    console.log('      Password: admin123!');
    console.log('      Role: ADMIN');
    console.log('');
    console.log('   🌍 PlanetTalk Admin:');
    console.log('      Email: ptadmin@planettalk.com');
    console.log('      Password: ptadmin123!');
    console.log('      Role: PT_ADMIN');
    console.log('');
    console.log('🧪 Ready for testing!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await app.close();
  }
}

cleanupAndReset()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
