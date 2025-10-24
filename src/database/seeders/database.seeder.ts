import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User, UserRole, UserStatus } from '../../modules/users/entities/user.entity';
import { Agent, AgentStatus, AgentTier } from '../../modules/agents/entities/agent.entity';
import { AgentApplication, ApplicationStatus, ApplicationSource } from '../../modules/agents/entities/agent-application.entity';
import { ReferralCode, ReferralCodeStatus, ReferralCodeType } from '../../modules/agents/entities/referral-code.entity';
import { ReferralUsage, ReferralUsageStatus } from '../../modules/agents/entities/referral-usage.entity';
import { AgentEarnings, EarningType, EarningStatus } from '../../modules/agents/entities/agent-earnings.entity';
import { Payout, PayoutStatus, PayoutMethod } from '../../modules/agents/entities/payout.entity';

@Injectable()
export class DatabaseSeeder {
  private readonly logger = new Logger(DatabaseSeeder.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
    @InjectRepository(AgentApplication)
    private applicationsRepository: Repository<AgentApplication>,
    @InjectRepository(ReferralCode)
    private referralCodesRepository: Repository<ReferralCode>,
    @InjectRepository(ReferralUsage)
    private referralUsageRepository: Repository<ReferralUsage>,
    @InjectRepository(AgentEarnings)
    private earningsRepository: Repository<AgentEarnings>,
    @InjectRepository(Payout)
    private payoutsRepository: Repository<Payout>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      // Clear existing data
      await this.clearDatabase();

      // Create users
      const users = await this.createUsers();
      this.logger.log(`Created ${users.length} users`);

      // Create agents
      const agents = await this.createAgents(users);
      this.logger.log(`Created ${agents.length} agents`);

      // Create applications
      const applications = await this.createApplications();
      this.logger.log(`Created ${applications.length} applications`);

      // Create referral codes
      const referralCodes = await this.createReferralCodes(agents);
      this.logger.log(`Created ${referralCodes.length} referral codes`);

      // Create referral usage
      const referralUsage = await this.createReferralUsage(referralCodes);
      this.logger.log(`Created ${referralUsage.length} referral usage records`);

      // Create earnings
      const earnings = await this.createEarnings(agents, referralUsage);
      this.logger.log(`Created ${earnings.length} earnings records`);

      // Create enhanced rewards for all agents
      const enhancedRewards = await this.createEnhancedRewards(agents);
      this.logger.log(`Created ${enhancedRewards.length} enhanced reward records`);

      // Create payouts
      const payouts = await this.createPayouts(agents);
      this.logger.log(`Created ${payouts.length} payout records`);

      this.logger.log('Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('Database seeding failed:', error);
      throw error;
    }
  }

  private async clearDatabase(): Promise<void> {
    this.logger.log('Clearing existing data...');
    
    // Delete in reverse order of dependencies
    await this.payoutsRepository.delete({});
    await this.earningsRepository.delete({});
    await this.referralUsageRepository.delete({});
    await this.referralCodesRepository.delete({});
    await this.applicationsRepository.delete({});
    await this.agentsRepository.delete({});
    await this.usersRepository.delete({});
    
    this.logger.log('Existing data cleared');
  }

  private async createUsers(): Promise<User[]> {
    const saltRounds = 10;
    const users = [];

    // Create Admin User
    const adminUser = this.usersRepository.create({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@agentportal.com',
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', saltRounds),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: '+1-555-001-0001',
      emailVerifiedAt: new Date(),
      isFirstLogin: false,
      metadata: {
        createdBy: 'seeder',
        isTestData: true,
      },
    });

    // Create PT Admin Users
    const ptAdmin1 = this.usersRepository.create({
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@agentportal.com',
      username: 'sarah.johnson',
      passwordHash: await bcrypt.hash('ptadmin123', saltRounds),
      role: UserRole.PT_ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: '+1-555-001-0002',
      emailVerifiedAt: new Date(),
      isFirstLogin: false,
      metadata: {
        createdBy: 'seeder',
        isTestData: true,
        department: 'Agent Management',
      },
    });

    const ptAdmin2 = this.usersRepository.create({
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael.chen@agentportal.com',
      username: 'michael.chen',
      passwordHash: await bcrypt.hash('ptadmin123', saltRounds),
      role: UserRole.PT_ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: '+1-555-001-0003',
      emailVerifiedAt: new Date(),
      isFirstLogin: false,
      metadata: {
        createdBy: 'seeder',
        isTestData: true,
        department: 'Finance',
      },
    });

    // Create Agent Users
    const agentUsers = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        username: 'john.doe',
        phoneNumber: '+1-555-101-0001',
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        username: 'jane.smith',
        phoneNumber: '+1-555-101-0002',
      },
      {
        firstName: 'Robert',
        lastName: 'Wilson',
        email: 'robert.wilson@example.com',
        username: 'robert.wilson',
        phoneNumber: '+1-555-101-0003',
      },
      {
        firstName: 'Emily',
        lastName: 'Brown',
        email: 'emily.brown@example.com',
        username: 'emily.brown',
        phoneNumber: '+1-555-101-0004',
      },
      {
        firstName: 'David',
        lastName: 'Davis',
        email: 'david.davis@example.com',
        username: 'david.davis',
        phoneNumber: '+1-555-101-0005',
      },
    ];

    for (const userData of agentUsers) {
      const user = this.usersRepository.create({
        ...userData,
        passwordHash: await bcrypt.hash('agent123', saltRounds),
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        isFirstLogin: false,
        metadata: {
          createdBy: 'seeder',
          isTestData: true,
        },
      });
      users.push(user);
    }

    // Add admin users
    users.unshift(adminUser, ptAdmin1, ptAdmin2);

    return this.usersRepository.save(users);
  }

  private async createAgents(users: User[]): Promise<Agent[]> {
    const agentUsers = users.filter(user => user.role === UserRole.AGENT);
    const agents = [];

    const agentData = [
      {
        tier: AgentTier.GOLD,
        status: AgentStatus.ACTIVE,
        totalEarnings: 5250.75,
        availableBalance: 3200.50,
        pendingBalance: 800.00,
        totalReferrals: 45,
        activeReferrals: 32,
        commissionRate: 10.00,
        activatedAt: new Date('2023-06-15'),
      },
      {
        tier: AgentTier.SILVER,
        status: AgentStatus.ACTIVE,
        totalEarnings: 2890.25,
        availableBalance: 1950.75,
        pendingBalance: 450.00,
        totalReferrals: 28,
        activeReferrals: 22,
        commissionRate: 10.00,
        activatedAt: new Date('2023-08-22'),
      },
      {
        tier: AgentTier.BRONZE,
        status: AgentStatus.ACTIVE,
        totalEarnings: 1680.50,
        availableBalance: 1200.25,
        pendingBalance: 250.00,
        totalReferrals: 18,
        activeReferrals: 14,
        commissionRate: 10.00,
        activatedAt: new Date('2023-10-05'),
      },
      {
        tier: AgentTier.BRONZE,
        status: AgentStatus.CREDENTIALS_SENT,
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0,
        totalReferrals: 0,
        activeReferrals: 0,
        commissionRate: 10.00,
        activatedAt: null,
      },
      {
        tier: AgentTier.BRONZE,
        status: AgentStatus.CODE_GENERATED,
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0,
        totalReferrals: 0,
        activeReferrals: 0,
        commissionRate: 10.00,
        activatedAt: null,
      },
    ];

    for (let i = 0; i < agentUsers.length && i < agentData.length; i++) {
      const agent = this.agentsRepository.create({
        userId: agentUsers[i].id,
        agentCode: `AGT${String(i + 1).padStart(5, '0')}`,
        ...agentData[i],
        lastActivityAt: new Date(),
        notes: `Test agent ${i + 1} - ${agentUsers[i].firstName} ${agentUsers[i].lastName}`,
        metadata: {
          createdBy: 'seeder',
          isTestData: true,
          onboardingCompleted: agentData[i].status === AgentStatus.ACTIVE,
        },
      });
      agents.push(agent);
    }

    return this.agentsRepository.save(agents);
  }

  private async createApplications(): Promise<AgentApplication[]> {
    const applications = [];

    const applicationData = [
      {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com',
        phoneNumber: '+1-555-201-0001',
        status: ApplicationStatus.SUBMITTED,
        source: ApplicationSource.WEB_FORM,
        dateOfBirth: new Date('1985-03-15'),
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        experience: 'Active in diaspora community, regularly sends airtime to family in Africa',
        motivation: 'Want to earn commission helping my community stay connected with affordable airtime',
        currentEmployment: 'Community Leader / PlanetTalk User',
        hasLicense: true,
        licenseNumber: 'NY-INS-123456',
        licenseExpiryDate: new Date('2025-12-31'),
        submittedAt: new Date('2024-01-15'),
      },
      {
        firstName: 'Carlos',
        lastName: 'Rodriguez',
        email: 'carlos.rodriguez@example.com',
        phoneNumber: '+1-555-201-0002',
        status: ApplicationStatus.UNDER_REVIEW,
        source: ApplicationSource.REFERRAL,
        dateOfBirth: new Date('1990-07-22'),
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        experience: 'Small business owner with large network, frequently helps community with mobile money transfers',
        motivation: 'Want to earn passive income helping diaspora community with affordable airtime top-ups',
        currentEmployment: 'Small Business Owner / Community Connector',
        hasLicense: false,
        submittedAt: new Date('2024-01-18'),
        reviewedBy: null, // Will be set to PT Admin ID later
        reviewedAt: new Date('2024-01-19'),
        reviewNotes: 'Strong sales background, needs to obtain license',
      },
      {
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@example.com',
        phoneNumber: '+1-555-201-0003',
        status: ApplicationStatus.REJECTED,
        source: ApplicationSource.SOCIAL_MEDIA,
        dateOfBirth: new Date('1988-11-08'),
        address: '789 Pine St',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA',
        experience: 'No prior sales experience',
        motivation: 'Looking for a career change',
        currentEmployment: 'Administrative Assistant',
        hasLicense: false,
        submittedAt: new Date('2024-01-10'),
        reviewedBy: null, // Will be set to PT Admin ID later
        reviewedAt: new Date('2024-01-12'),
        reviewNotes: 'Lacks required sales experience',
        rejectionReason: 'Minimum 2 years sales experience required',
      },
    ];

    for (const appData of applicationData) {
      const application = this.applicationsRepository.create({
        ...appData,
        metadata: {
          createdBy: 'seeder',
          isTestData: true,
          source: 'application_form',
        },
      });
      applications.push(application);
    }

    return this.applicationsRepository.save(applications);
  }

  private async createReferralCodes(agents: Agent[]): Promise<ReferralCode[]> {
    const activeAgents = agents.filter(agent => agent.status === AgentStatus.ACTIVE);
    const referralCodes = [];

    const codeData = [
      {
        code: 'SUMMER2024',
        type: ReferralCodeType.PROMOTIONAL,
        status: ReferralCodeStatus.ACTIVE,
        description: 'Summer 2024 Promotion',
        bonusCommissionRate: 2.5,
        maxUses: 50,
        currentUses: 15,
        expiresAt: new Date('2024-08-31'),
      },
      {
        code: 'NEWCLIENT',
        type: ReferralCodeType.STANDARD,
        status: ReferralCodeStatus.ACTIVE,
        description: 'New Client Referral',
        bonusCommissionRate: 0,
        maxUses: null,
        currentUses: 8,
        expiresAt: null,
      },
      {
        code: 'VIP2024',
        type: ReferralCodeType.VIP,
        status: ReferralCodeStatus.ACTIVE,
        description: 'VIP Client Program',
        bonusCommissionRate: 5.0,
        maxUses: 20,
        currentUses: 3,
        expiresAt: new Date('2024-12-31'),
      },
      {
        code: 'EXPIRED2023',
        type: ReferralCodeType.LIMITED_TIME,
        status: ReferralCodeStatus.EXPIRED,
        description: 'Expired Limited Time Offer',
        bonusCommissionRate: 3.0,
        maxUses: 100,
        currentUses: 100,
        expiresAt: new Date('2023-12-31'),
      },
    ];

    for (let i = 0; i < activeAgents.length && i < codeData.length; i++) {
      const referralCode = this.referralCodesRepository.create({
        agentId: activeAgents[i].id,
        ...codeData[i],
        lastUsedAt: new Date(),
        metadata: {
          createdBy: 'seeder',
          isTestData: true,
          campaign: codeData[i].code,
        },
      });
      referralCodes.push(referralCode);
    }

    // Add some additional codes for the first agent
    if (activeAgents.length > 0) {
      const additionalCodes = [
        {
          code: 'JOHN2024',
          type: ReferralCodeType.STANDARD,
          status: ReferralCodeStatus.ACTIVE,
          description: 'Personal referral code',
          bonusCommissionRate: 1.0,
          maxUses: null,
          currentUses: 12,
          expiresAt: null,
        },
        {
          code: 'FAMILY',
          type: ReferralCodeType.STANDARD,
          status: ReferralCodeStatus.ACTIVE,
          description: 'Family and friends',
          bonusCommissionRate: 0,
          maxUses: null,
          currentUses: 5,
          expiresAt: null,
        },
      ];

      for (const codeData of additionalCodes) {
        const referralCode = this.referralCodesRepository.create({
          agentId: activeAgents[0].id,
          ...codeData,
          lastUsedAt: new Date(),
          metadata: {
            createdBy: 'seeder',
            isTestData: true,
          },
        });
        referralCodes.push(referralCode);
      }
    }

    return this.referralCodesRepository.save(referralCodes);
  }

  private async createReferralUsage(referralCodes: ReferralCode[]): Promise<ReferralUsage[]> {
    const referralUsage = [];

    const usageData = [
      {
        status: ReferralUsageStatus.CONFIRMED,
        referredUserEmail: 'customer1@example.com',
        referredUserName: 'Kofi Mensah (Ghana Airtime)',
        referredUserPhone: '+1-555-301-0001',
        commissionEarned: 125.50,
        commissionRate: 10.0,
        confirmedAt: new Date('2024-01-20'),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      {
        status: ReferralUsageStatus.CONFIRMED,
        referredUserEmail: 'customer2@example.com',
        referredUserName: 'Amina Kone (Nigeria Airtime)',
        referredUserPhone: '+1-555-301-0002',
        commissionEarned: 95.75,
        commissionRate: 10.0,
        confirmedAt: new Date('2024-01-22'),
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      },
      {
        status: ReferralUsageStatus.PENDING,
        referredUserEmail: 'customer3@example.com',
        referredUserName: 'Lisa Brown',
        referredUserPhone: '+1-555-301-0003',
        commissionEarned: 0,
        commissionRate: 10.0,
        confirmedAt: null,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    ];

    for (let i = 0; i < referralCodes.length && i < usageData.length; i++) {
      const usage = this.referralUsageRepository.create({
        referralCodeId: referralCodes[i].id,
        ...usageData[i],
        usedAt: new Date(),
        metadata: {
          createdBy: 'seeder',
          isTestData: true,
          source: 'web_form',
        },
      });
      referralUsage.push(usage);
    }

    return this.referralUsageRepository.save(referralUsage);
  }

  private async createEarnings(agents: Agent[], referralUsage: ReferralUsage[]): Promise<AgentEarnings[]> {
    const activeAgents = agents.filter(agent => agent.status === AgentStatus.ACTIVE);
    const earnings = [];

    // Create various types of earnings for each active agent
    for (const agent of activeAgents) {
      const agentEarnings = [
        {
          type: EarningType.REFERRAL_COMMISSION,
          status: EarningStatus.CONFIRMED,
          amount: 125.50,
          currency: 'USD',
          commissionRate: agent.commissionRate,
          description: 'Commission from Nigeria MTN Airtime - Customer referral',
          referenceId: 'REF-2024-001',
          earnedAt: new Date('2024-01-20'),
          confirmedAt: new Date('2024-01-21'),
          referralUsageId: referralUsage[0]?.id,
        },
        {
          type: EarningType.REFERRAL_COMMISSION,
          status: EarningStatus.CONFIRMED,
          amount: 95.75,
          currency: 'USD',
          commissionRate: agent.commissionRate,
          description: 'Commission from Kenya Safaricom Airtime - Customer referral',
          referenceId: 'REF-2024-002',
          earnedAt: new Date('2024-01-22'),
          confirmedAt: new Date('2024-01-23'),
          referralUsageId: referralUsage[1]?.id,
        },
        {
          type: EarningType.BONUS,
          status: EarningStatus.CONFIRMED,
          amount: 200.00,
          currency: 'USD',
          commissionRate: null,
          description: 'Monthly diaspora community bonus',
          referenceId: 'BONUS-2024-JAN',
          earnedAt: new Date('2024-01-31'),
          confirmedAt: new Date('2024-02-01'),
        },
        {
          type: EarningType.REFERRAL_COMMISSION,
          status: EarningStatus.PENDING,
          amount: 110.25,
          currency: 'USD',
          commissionRate: agent.commissionRate,
          description: 'Pending commission - Lisa Brown',
          referenceId: 'REF-2024-003',
          earnedAt: new Date('2024-01-25'),
          confirmedAt: null,
          referralUsageId: referralUsage[2]?.id,
        },
      ];

      for (const earningData of agentEarnings) {
        const earning = this.earningsRepository.create({
          agentId: agent.id,
          ...earningData,
          metadata: {
            createdBy: 'seeder',
            isTestData: true,
            agentTier: agent.tier,
          },
        });
        earnings.push(earning);
      }
    }

    return this.earningsRepository.save(earnings);
  }

  private async createEnhancedRewards(agents: Agent[]): Promise<AgentEarnings[]> {
    const activeAgents = agents.filter(agent => agent.status === AgentStatus.ACTIVE);
    const allEarnings = [];

    this.logger.log('🎁 Creating enhanced rewards and earnings for all agents...');

    for (const agent of activeAgents) {
      const agentIndex = activeAgents.indexOf(agent);
      const isTopPerformer = agentIndex === 0; // #1 performer
      const isHighPerformer = agentIndex < 3; // Top 3
      const isMediumPerformer = agentIndex < 6; // Top 6

      this.logger.log(`💰 Generating rewards for Agent ${agent.agentCode} (${agent.tier} tier)`);

      const agentEarnings = [];
      
      // Generate 6 months of earnings history
      for (let month = 6; month >= 0; month--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - month);
        
        // Monthly referral commissions based on performance tier
        const referralCount = this.getMonthlyReferralCount(isTopPerformer, isHighPerformer, isMediumPerformer);
        
        for (let ref = 0; ref < referralCount; ref++) {
          const baseAmount = this.getRandomCommissionAmount(agent.tier);
          const commissionAmount = baseAmount * (parseFloat(agent.commissionRate.toString()) / 100);
          
          agentEarnings.push({
            type: EarningType.REFERRAL_COMMISSION,
            status: month === 0 && ref > referralCount - 2 ? EarningStatus.PENDING : EarningStatus.CONFIRMED,
            amount: Math.round(commissionAmount * 100) / 100,
            currency: 'USD',
            commissionRate: parseFloat(agent.commissionRate.toString()),
            description: `Commission from ${this.getRandomAirtimeService()}`,
            referenceId: `REF-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(ref + 1).padStart(3, '0')}`,
            earnedAt: new Date(monthDate.getTime() + (ref * 2 * 24 * 60 * 60 * 1000)), // Every 2 days
            confirmedAt: month === 0 && ref > referralCount - 2 ? null : new Date(monthDate.getTime() + (ref * 2 * 24 * 60 * 60 * 1000) + (24 * 60 * 60 * 1000)),
          });
        }

        // Performance bonuses
        if (this.shouldReceiveBonus(isTopPerformer, isHighPerformer, isMediumPerformer, month)) {
          const bonusAmount = this.getBonusAmount(isTopPerformer, isHighPerformer, isMediumPerformer);
          agentEarnings.push({
            type: EarningType.BONUS,
            status: EarningStatus.CONFIRMED,
            amount: bonusAmount,
            currency: 'USD',
            commissionRate: null,
            description: this.getBonusDescription(isTopPerformer, isHighPerformer),
            referenceId: `BONUS-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
            earnedAt: new Date(monthDate.getFullYear(), monthDate.getMonth(), 28),
            confirmedAt: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1),
          });
        }
      }

      // Add special rewards and adjustments
      agentEarnings.push(...this.generateSpecialRewards(agent, isTopPerformer, isHighPerformer));

      // Create database records
      for (const earning of agentEarnings) {
        const agentEarning = this.earningsRepository.create({
          agentId: agent.id,
          ...earning,
          metadata: {
            createdBy: 'enhanced-seeder',
            isTestData: true,
            agentTier: agent.tier,
            performanceCategory: isTopPerformer ? 'top' : isHighPerformer ? 'high' : isMediumPerformer ? 'medium' : 'standard',
          },
        });
        allEarnings.push(agentEarning);
      }

      // Update agent totals
      const confirmedEarnings = agentEarnings.filter(e => e.status === EarningStatus.CONFIRMED);
      const pendingEarnings = agentEarnings.filter(e => e.status === EarningStatus.PENDING);
      
      const totalEarnings = confirmedEarnings.reduce((sum, e) => sum + e.amount, 0);
      const pendingAmount = pendingEarnings.reduce((sum, e) => sum + e.amount, 0);
      
      // Simulate some payouts already made (available balance is less than total)
      const payoutRate = isTopPerformer ? 0.4 : isHighPerformer ? 0.5 : 0.7; // Higher performers keep more
      const availableBalance = totalEarnings * payoutRate;

      agent.totalEarnings = Math.round(totalEarnings * 100) / 100;
      agent.availableBalance = Math.round(availableBalance * 100) / 100;
      agent.pendingBalance = Math.round(pendingAmount * 100) / 100;
      agent.totalReferrals = agentEarnings.filter(e => e.type === EarningType.REFERRAL_COMMISSION).length;
      agent.activeReferrals = agentEarnings.filter(e => e.type === EarningType.REFERRAL_COMMISSION && e.status === EarningStatus.CONFIRMED).length;
      
      await this.agentsRepository.save(agent);

      this.logger.log(`💰 Agent ${agent.agentCode}: $${agent.totalEarnings} total, $${agent.availableBalance} available, ${agentEarnings.length} earnings`);
    }

    this.logger.log(`🎉 Created ${allEarnings.length} total earnings records with realistic reward patterns`);
    return this.earningsRepository.save(allEarnings);
  }

  private getMonthlyReferralCount(isTop: boolean, isHigh: boolean, isMedium: boolean): number {
    if (isTop) return Math.floor(Math.random() * 8) + 10; // 10-18 referrals
    if (isHigh) return Math.floor(Math.random() * 6) + 6;  // 6-12 referrals
    if (isMedium) return Math.floor(Math.random() * 4) + 3; // 3-7 referrals
    return Math.floor(Math.random() * 3) + 1; // 1-4 referrals
  }

  private getRandomCommissionAmount(tier: AgentTier): number {
    const baseAmounts = {
      [AgentTier.BRONZE]: [50, 75, 100, 125, 150],
      [AgentTier.SILVER]: [75, 100, 150, 200, 250],
      [AgentTier.GOLD]: [100, 150, 200, 300, 400],
      [AgentTier.PLATINUM]: [150, 250, 350, 500, 750],
    };
    
    const amounts = baseAmounts[tier] || baseAmounts[AgentTier.BRONZE];
    return amounts[Math.floor(Math.random() * amounts.length)];
  }

  private getRandomAirtimeService(): string {
    const types = [
      'Nigeria MTN Airtime',
      'Kenya Safaricom Airtime',
      'Ghana MTN Airtime',
      'Zimbabwe Econet Airtime',
      'South Africa Vodacom Airtime',
      'Uganda MTN Airtime',
      'Tanzania Vodacom Airtime',
      'International Data Bundle',
      'Mobile Money Transfer',
      'Diaspora Family Support',
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  private shouldReceiveBonus(isTop: boolean, isHigh: boolean, isMedium: boolean, month: number): boolean {
    if (isTop) return Math.random() > 0.3; // 70% chance
    if (isHigh) return Math.random() > 0.5; // 50% chance  
    if (isMedium) return Math.random() > 0.7; // 30% chance
    return Math.random() > 0.85; // 15% chance
  }

  private getBonusAmount(isTop: boolean, isHigh: boolean, isMedium: boolean): number {
    if (isTop) return Math.round((Math.random() * 700 + 500) * 100) / 100; // $500-1200
    if (isHigh) return Math.round((Math.random() * 400 + 300) * 100) / 100; // $300-700
    if (isMedium) return Math.round((Math.random() * 250 + 150) * 100) / 100; // $150-400
    return Math.round((Math.random() * 150 + 75) * 100) / 100; // $75-225
  }

  private getBonusDescription(isTop: boolean, isHigh: boolean): string {
    if (isTop) {
      const descriptions = [
        'Top Performer Award',
        'Excellence in Sales',
        'Leadership Bonus',
        'Outstanding Achievement',
        'Agent of the Month',
      ];
      return descriptions[Math.floor(Math.random() * descriptions.length)];
    }
    
    if (isHigh) {
      const descriptions = [
        'High Performance Bonus',
        'Sales Target Achievement',
        'Quality Service Award',
        'Customer Satisfaction Bonus',
      ];
      return descriptions[Math.floor(Math.random() * descriptions.length)];
    }
    
    const descriptions = [
      'Monthly Achievement',
      'Performance Bonus',
      'Goal Completion Reward',
      'Quality Improvement Bonus',
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private generateSpecialRewards(agent: Agent, isTop: boolean, isHigh: boolean): any[] {
    const specialRewards = [];
    const now = new Date();

    // Anniversary bonus (random chance)
    if (Math.random() > 0.8) {
      specialRewards.push({
        type: EarningType.BONUS,
        status: EarningStatus.CONFIRMED,
        amount: Math.round((Math.random() * 300 + 200) * 100) / 100,
        currency: 'USD',
        commissionRate: null,
        description: 'Agent Anniversary Bonus',
        referenceId: `ANNIVERSARY-${now.getFullYear()}`,
        earnedAt: new Date(now.getTime() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000),
        confirmedAt: new Date(now.getTime() - Math.floor(Math.random() * 360) * 24 * 60 * 60 * 1000),
      });
    }

    // Training completion bonus
    if (Math.random() > 0.6) {
      specialRewards.push({
        type: EarningType.BONUS,
        status: EarningStatus.CONFIRMED,
        amount: Math.round((Math.random() * 100 + 50) * 100) / 100,
        currency: 'USD',
        commissionRate: null,
        description: 'Training Completion Bonus',
        referenceId: `TRAINING-${now.getFullYear()}-${Math.floor(Math.random() * 1000)}`,
        earnedAt: new Date(now.getTime() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000),
        confirmedAt: new Date(now.getTime() - Math.floor(Math.random() * 85) * 24 * 60 * 60 * 1000),
      });
    }

    // Referral program bonus (for bringing in other agents)
    if (isTop || isHigh) {
      if (Math.random() > 0.7) {
        specialRewards.push({
          type: EarningType.BONUS,
          status: EarningStatus.CONFIRMED,
          amount: Math.round((Math.random() * 200 + 150) * 100) / 100,
          currency: 'USD',
          commissionRate: null,
          description: 'Agent Referral Bonus - New agent recruitment',
          referenceId: `AGENT-REF-${now.getFullYear()}-${Math.floor(Math.random() * 1000)}`,
          earnedAt: new Date(now.getTime() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
          confirmedAt: new Date(now.getTime() - Math.floor(Math.random() * 55) * 24 * 60 * 60 * 1000),
        });
      }
    }

    return specialRewards;
  }

  private async createPayouts(agents: Agent[]): Promise<Payout[]> {
    const activeAgents = agents.filter(agent => agent.status === AgentStatus.ACTIVE);
    const payouts = [];

    const payoutData = [
      {
        status: PayoutStatus.APPROVED,
        method: PayoutMethod.BANK_TRANSFER,
        amount: 500.00,
        fees: 5.00,
        netAmount: 495.00,
        currency: 'USD',
        description: 'Monthly payout - January 2024',
        transactionId: 'TXN-2024-001',
        requestedAt: new Date('2024-01-28'),
        approvedAt: new Date('2024-01-29'),
        processedAt: new Date('2024-01-30'),
        completedAt: new Date('2024-01-31'),
        adminNotes: 'Processed successfully via wire transfer',
        paymentDetails: {
          bankAccount: {
            accountNumber: '****7890',
            routingNumber: '021000021',
            accountName: 'John Doe',
            bankName: 'Chase Bank',
          },
        },
      },
      {
        status: PayoutStatus.PENDING,
        method: PayoutMethod.BANK_TRANSFER,
        amount: 300.00,
        fees: 3.00,
        netAmount: 297.00,
        currency: 'USD',
        description: 'Bi-weekly payout request',
        transactionId: null,
        requestedAt: new Date('2024-02-10'),
        approvedAt: new Date('2024-02-11'),
        processedAt: new Date('2024-02-12'),
        completedAt: null,
        adminNotes: 'Processing via PayPal',
        paymentDetails: {
          paypal: {
            email: 'jane.smith@example.com',
          },
        },
      },
      {
        status: PayoutStatus.PENDING,
        method: PayoutMethod.BANK_TRANSFER,
        amount: 750.00,
        fees: 0,
        netAmount: 750.00,
        currency: 'USD',
        description: 'Large payout request',
        transactionId: null,
        requestedAt: new Date('2024-02-15'),
        approvedAt: null,
        processedAt: null,
        completedAt: null,
        adminNotes: null,
        paymentDetails: {
          bankAccount: {
            accountNumber: '****5432',
            routingNumber: '111000025',
            accountName: 'Robert Wilson',
            bankName: 'Bank of America',
          },
        },
      },
    ];

    for (let i = 0; i < activeAgents.length && i < payoutData.length; i++) {
      const payout = this.payoutsRepository.create({
        agentId: activeAgents[i].id,
        ...payoutData[i],
        metadata: {
          createdBy: 'seeder',
          isTestData: true,
          agentCode: activeAgents[i].agentCode,
        },
      });
      payouts.push(payout);
    }

    return this.payoutsRepository.save(payouts);
  }
}
