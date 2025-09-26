import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from '../modules/users/entities/user.entity';
import { Agent } from '../modules/agents/entities/agent.entity';
import { AgentEarnings } from '../modules/agents/entities/agent-earnings.entity';
import { AgentApplication } from '../modules/agents/entities/agent-application.entity';
import { ReferralCode } from '../modules/agents/entities/referral-code.entity';
import { ReferralUsage } from '../modules/agents/entities/referral-usage.entity';
import { Payout } from '../modules/agents/entities/payout.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import * as bcrypt from 'bcryptjs';

async function cleanupDatabase() {
  console.log('🚀 Starting database cleanup...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Start transaction
    await dataSource.transaction(async (manager) => {
      console.log('📝 Starting cleanup transaction...');

      // 1. Delete all agent-related data (in order due to foreign keys)
      console.log('🗑️  Deleting agent earnings...');
      await manager.delete(AgentEarnings, {});

      console.log('🗑️  Deleting payouts...');
      await manager.delete(Payout, {});

      console.log('🗑️  Deleting referral usages...');
      await manager.delete(ReferralUsage, {});

      console.log('🗑️  Deleting referral codes...');
      await manager.delete(ReferralCode, {});

      console.log('🗑️  Deleting agent applications...');
      await manager.delete(AgentApplication, {});

      console.log('🗑️  Deleting agents...');
      await manager.delete(Agent, {});

      console.log('🗑️  Deleting notifications...');
      await manager.delete(Notification, {});

      // 2. Delete all users
      console.log('🗑️  Deleting all users...');
      await manager.delete(User, {});

      // 3. Create a single admin user
      console.log('👤 Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123!', 10);
      
      const adminUser = manager.create(User, {
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@planettalk.com',
        username: 'admin@planettalk.com',
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isFirstLogin: false,
        emailVerifiedAt: new Date(),
        metadata: {
          createdBy: 'cleanup-script',
          isTestAdmin: true,
          createdAt: new Date().toISOString(),
        },
      });

      await manager.save(User, adminUser);

      console.log('✅ Admin user created successfully!');
    });

    console.log('🎉 Database cleanup completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   ✅ All agents deleted');
    console.log('   ✅ All users deleted');
    console.log('   ✅ All agent-related data deleted');
    console.log('   ✅ Admin user created');
    console.log('');
    console.log('🔑 Admin Login Credentials:');
    console.log('   Email: admin@planettalk.com');
    console.log('   Password: admin123!');
    console.log('   Role: ADMIN');
    console.log('');
    console.log('🧪 Ready for end-to-end testing!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the cleanup
cleanupDatabase()
  .then(() => {
    console.log('🏁 Cleanup script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
