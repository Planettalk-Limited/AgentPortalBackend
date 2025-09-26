import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseSeeder } from './database.seeder';
import { SeederModule } from './seeder.module';
import { getDatabaseConfig } from '../../config/database.config';

async function bootstrap() {
  const logger = new Logger('DatabaseSeeder');
  
  try {
    logger.log('Initializing database seeder...');
    
    // Create a minimal NestJS application for seeding
    const app = await NestFactory.createApplicationContext(
      {
        module: class AppModule {},
        imports: [
          ConfigService,
          TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
          }),
          SeederModule,
        ],
        providers: [ConfigService],
      }
    );

    // Get the seeder service
    const seeder = app.get(DatabaseSeeder);
    
    // Run the seeding
    await seeder.seed();
    
    logger.log('Database seeding completed successfully!');
    logger.log('');
    logger.log('🎉 Test Data Created:');
    logger.log('');
    logger.log('👤 Admin Login:');
    logger.log('   Email: admin@agentportal.com');
    logger.log('   Password: admin123');
    logger.log('');
    logger.log('👥 PT Admin Logins:');
    logger.log('   Email: sarah.johnson@agentportal.com');
    logger.log('   Password: ptadmin123');
    logger.log('   Email: michael.chen@agentportal.com');
    logger.log('   Password: ptadmin123');
    logger.log('');
    logger.log('🏢 Agent Logins:');
    logger.log('   Email: john.doe@example.com');
    logger.log('   Password: agent123');
    logger.log('   Email: jane.smith@example.com');
    logger.log('   Password: agent123');
    logger.log('   Email: robert.wilson@example.com');
    logger.log('   Password: agent123');
    logger.log('');
    logger.log('💡 Test Features:');
    logger.log('   • Active agents with earnings and referral codes');
    logger.log('   • Pending applications to review');
    logger.log('   • Sample payouts in different statuses');
    logger.log('   • Referral codes you can test');
    logger.log('   • Complete agent dashboard data');
    logger.log('');
    logger.log('🔗 API Documentation: http://localhost:3000/api/docs');
    
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
}

bootstrap();
