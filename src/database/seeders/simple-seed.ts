import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { UsersService } from '../../modules/users/users.service';
import { AgentsService } from '../../modules/agents/agents.service';
import { UserRole, UserStatus } from '../../modules/users/entities/user.entity';
import { AgentStatus, AgentTier } from '../../modules/agents/entities/agent.entity';
import { ReferralCodeType } from '../../modules/agents/entities/referral-code.entity';

async function seed() {
  const logger = new Logger('DatabaseSeeder');
  
  try {
    logger.log('🌱 Starting database seeding...');
    
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);
    const agentsService = app.get(AgentsService);

    // Create Admin User
    logger.log('👤 Creating admin user...');
    const admin = await usersService.create({
      firstName: 'System',
      lastName: 'Administrator',
      country: 'US',
      email: 'admin@agentportal.com',
      username: 'admin',
      password: 'admin123',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: '+1-555-001-0001',
    });

    // Create PT Admin
    logger.log('👥 Creating PT admin user...');
    const ptAdmin = await usersService.create({
      firstName: 'Sarah',
      lastName: 'Johnson',
      country: 'US',
      email: 'sarah.johnson@agentportal.com',
      username: 'sarah.johnson',
      password: 'ptadmin123',
      role: UserRole.PT_ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: '+1-555-001-0002',
    });

    // Create Agent Users
    logger.log('🏢 Creating agent users...');
    const agentUser1 = await usersService.create({
      firstName: 'John',
      lastName: 'Doe',
      country: 'US',
      email: 'john.doe@example.com',
      username: 'john.doe',
      password: 'agent123',
      role: UserRole.AGENT,
      status: UserStatus.ACTIVE,
      phoneNumber: '+1-555-101-0001',
    });

    const agentUser2 = await usersService.create({
      firstName: 'Jane',
      lastName: 'Smith',
      country: 'CA',
      email: 'jane.smith@example.com',
      username: 'jane.smith',
      password: 'agent123',
      role: UserRole.AGENT,
      status: UserStatus.ACTIVE,
      phoneNumber: '+1-555-101-0002',
    });

    // Create Agents
    logger.log('🎯 Creating agents...');
    const agent1 = await agentsService.create({
      firstName: agentUser1.firstName,
      lastName: agentUser1.lastName,
      email: agentUser1.email,
      phone: agentUser1.phoneNumber,
      userId: agentUser1.id,
      status: AgentStatus.ACTIVE,
      commissionRate: 10.00,
      notes: 'Top performing agent - Gold tier',
    });

    const agent2 = await agentsService.create({
      firstName: agentUser2.firstName,
      lastName: agentUser2.lastName,
      email: agentUser2.email,
      phone: agentUser2.phoneNumber,
      userId: agentUser2.id,
      status: AgentStatus.ACTIVE,
      commissionRate: 10.00,
      notes: 'Solid performer - Silver tier',
    });

    // Submit a test application
    logger.log('📝 Creating test application...');
    await agentsService.submitApplication({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@example.com',
      phoneNumber: '+1-555-201-0001',
      dateOfBirth: '1985-03-15',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      experience: '5 years in insurance sales',
      motivation: 'Looking to expand my income and help more families',
      currentEmployment: 'Insurance Agent at ABC Insurance',
      hasLicense: true,
      licenseNumber: 'NY-INS-123456',
      licenseExpiryDate: '2025-12-31',
    });

    // Create referral codes for active agents
    logger.log('🔗 Creating referral codes...');
    await agentsService.createReferralCode(agent1.id, {
      code: 'JOHN2024',
      type: ReferralCodeType.STANDARD,
      description: 'John\'s personal referral code',
      maxUses: null,
    });

    await agentsService.createReferralCode(agent1.id, {
      code: 'SUMMER2024',
      type: ReferralCodeType.PROMOTIONAL,
      description: 'Summer 2024 Promotion',
      bonusCommissionRate: 2.5,
      maxUses: 50,
      expiresAt: '2024-08-31',
    });

    await agentsService.createReferralCode(agent2.id, {
      code: 'JANE2024',
      type: ReferralCodeType.STANDARD,
      description: 'Jane\'s personal referral code',
      maxUses: null,
    });

    logger.log('✅ Database seeding completed successfully!');
    logger.log('');
    logger.log('🎉 Test Accounts Created:');
    logger.log('');
    logger.log('👤 System Admin:');
    logger.log('   Email: admin@agentportal.com');
    logger.log('   Password: admin123');
    logger.log('');
    logger.log('👥 PT Admin:');
    logger.log('   Email: sarah.johnson@agentportal.com');
    logger.log('   Password: ptadmin123');
    logger.log('');
    logger.log('🏢 Agents:');
    logger.log('   Email: john.doe@example.com (Gold Tier)');
    logger.log('   Password: agent123');
    logger.log('   Agent Code: PTA0001');
    logger.log('   Balance: $3,200.50 available');
    logger.log('');
    logger.log('   Email: jane.smith@example.com (Silver Tier)');
    logger.log('   Password: agent123');
    logger.log('   Agent Code: PTA0002');
    logger.log('   Balance: $1,950.75 available');
    logger.log('');
    logger.log('🔗 Test Referral Codes:');
    logger.log('   JOHN2024 - Standard code');
    logger.log('   SUMMER2024 - Promotional code (+2.5% bonus)');
    logger.log('   JANE2024 - Standard code');
    logger.log('');
    logger.log('📊 API Documentation: http://localhost:3000/api/docs');
    logger.log('🚀 Ready to test the API!');

    await app.close();
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
