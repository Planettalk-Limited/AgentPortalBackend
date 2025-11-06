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
export class PlanetTalkSeeder {
  private readonly logger = new Logger(PlanetTalkSeeder.name);

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
    this.logger.log('🌍 Starting PlanetTalk Agent Portal seeding...');

    try {
      // Clear existing data
      await this.clearDatabase();

      // Create PlanetTalk-focused users
      const users = await this.createPlanetTalkUsers();
      this.logger.log(`Created ${users.length} PlanetTalk users`);

      // Create diaspora community agents
      const agents = await this.createDiasporaAgents(users);
      this.logger.log(`Created ${agents.length} diaspora community agents`);

      // Create community-focused referral codes
      const referralCodes = await this.createCommunityReferralCodes(agents);
      this.logger.log(`Created ${referralCodes.length} community referral codes`);

      // Create airtime commission earnings
      const earnings = await this.createAirtimeCommissions(agents, referralCodes);
      this.logger.log(`Created ${earnings.length} airtime commission records`);

      // Create airtime/mobile money payouts
      const payouts = await this.createAirtimePayouts(agents);
      this.logger.log(`Created ${payouts.length} airtime payout records`);

      this.logger.log('🎉 PlanetTalk Agent Portal seeding completed successfully!');
    } catch (error) {
      this.logger.error('❌ PlanetTalk seeding failed:', error);
      throw error;
    }
  }

  private async clearDatabase(): Promise<void> {
    this.logger.log('🧹 Clearing existing data...');
    
    try {
      // Clear in reverse dependency order
      await this.payoutsRepository.createQueryBuilder().delete().from('payouts').execute();
      await this.earningsRepository.createQueryBuilder().delete().from('agent_earnings').execute();
      await this.referralUsageRepository.createQueryBuilder().delete().from('referral_usages').execute();
      await this.referralCodesRepository.createQueryBuilder().delete().from('referral_codes').execute();
      await this.applicationsRepository.createQueryBuilder().delete().from('agent_applications').execute();
      await this.agentsRepository.createQueryBuilder().delete().from('agents').execute();
      await this.usersRepository.createQueryBuilder().delete().from('users').execute();
      this.logger.log('✅ Database cleared successfully');
    } catch (error) {
      this.logger.warn('⚠️ Some tables may be empty, continuing with seeding...');
    }
  }

  private async createPlanetTalkUsers(): Promise<User[]> {
    const saltRounds = 10;
    const users = [];

    // System Admin
    const adminUser = this.usersRepository.create({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@planettalk.com',
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', saltRounds),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: '+1-555-001-0001',
      emailVerifiedAt: new Date(),
      metadata: {
        createdBy: 'planettalk-seeder',
        isTestData: true,
        department: 'System Administration',
      },
    });

    // PlanetTalk Operations Manager
    const ptAdmin = this.usersRepository.create({
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria.santos@planettalk.com',
      username: 'maria.santos',
      passwordHash: await bcrypt.hash('ptadmin123', saltRounds),
      role: UserRole.PT_ADMIN,
      status: UserStatus.ACTIVE,
      phoneNumber: '+1-555-002-0001',
      emailVerifiedAt: new Date(),
      metadata: {
        createdBy: 'planettalk-seeder',
        isTestData: true,
        department: 'Agent Operations',
        specialization: 'Diaspora Community Management',
      },
    });

    // Community Agents (Diaspora Representatives)
    const diasporaAgents = [
      {
        firstName: 'Kwame',
        lastName: 'Asante',
        email: 'kwame.asante@example.com',
        username: 'kwame.asante',
        phoneNumber: '+233244567890',
        location: 'London, UK → Ghana',
        community: 'Ghanaian Diaspora',
      },
      {
        firstName: 'Amara',
        lastName: 'Okafor',
        email: 'amara.okafor@example.com',
        username: 'amara.okafor', 
        phoneNumber: '+234803456789',
        location: 'Houston, TX → Nigeria',
        community: 'Nigerian Diaspora',
      },
      {
        firstName: 'Thandiwe',
        lastName: 'Moyo',
        email: 'thandiwe.moyo@example.com',
        username: 'thandiwe.moyo',
        phoneNumber: '+263771234567',
        location: 'Toronto, CA → Zimbabwe',
        community: 'Zimbabwean Diaspora',
      },
      {
        firstName: 'Grace',
        lastName: 'Wanjiku',
        email: 'grace.wanjiku@example.com',
        username: 'grace.wanjiku',
        phoneNumber: '+254701234567',
        location: 'Boston, MA → Kenya',
        community: 'Kenyan Diaspora',
      },
    ];

    for (const agentData of diasporaAgents) {
      const user = this.usersRepository.create({
        ...agentData,
        passwordHash: await bcrypt.hash('agent123', saltRounds),
        role: UserRole.AGENT,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        metadata: {
          createdBy: 'planettalk-seeder',
          isTestData: true,
          diasporaInfo: {
            location: agentData.location,
            community: agentData.community,
            joinedProgram: new Date().toISOString(),
          },
        },
      });
      users.push(user);
    }

    users.unshift(adminUser, ptAdmin);
    return this.usersRepository.save(users);
  }

  private async createDiasporaAgents(users: User[]): Promise<Agent[]> {
    const agents = [];
    const agentUsers = users.filter(user => user.role === UserRole.AGENT);

    const agentConfigs = [
      { tier: AgentTier.BRONZE, commissionRate: 10.0, notes: 'New to PlanetTalk referral program' },
      { tier: AgentTier.SILVER, commissionRate: 10.0, notes: 'Growing network in diaspora community' },
      { tier: AgentTier.GOLD, commissionRate: 10.0, notes: 'Strong community presence and referrals' },
      { tier: AgentTier.PLATINUM, commissionRate: 10.0, notes: 'Top performer - extensive diaspora network' },
    ];

    for (let i = 0; i < agentUsers.length; i++) {
      const user = agentUsers[i];
      const config = agentConfigs[i] || agentConfigs[0];
      
      const agent = this.agentsRepository.create({
        userId: user.id,
        agentCode: await this.generateAgentCode(),
        status: AgentStatus.ACTIVE,
        tier: config.tier,
        commissionRate: config.commissionRate,
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0,
        totalReferrals: 0,
        activeReferrals: 0,
        notes: config.notes,
        activatedAt: new Date(),
        lastActivityAt: new Date(),
        metadata: {
          createdBy: 'planettalk-seeder',
          isTestData: true,
          program: 'PlanetTalk Diaspora Agent',
          commissionPeriod: '24 months',
        },
      });
      agents.push(agent);
    }

    return this.agentsRepository.save(agents);
  }

  private async createCommunityReferralCodes(agents: Agent[]): Promise<ReferralCode[]> {
    const referralCodes = [];

    const planetTalkCodes = [
      {
        code: 'DIASPORA2024',
        type: ReferralCodeType.PROMOTIONAL,
        description: 'Diaspora Community Special - Connect your family for less!',
        bonusCommissionRate: 3.0,
        maxUses: 200,
        currentUses: 45,
      },
      {
        code: 'FAMILYFIRST',
        type: ReferralCodeType.VIP,
        description: 'Family First - Premium airtime services for diaspora',
        bonusCommissionRate: 5.0,
        maxUses: 100,
        currentUses: 23,
      },
      {
        code: 'HOMECONNECT',
        type: ReferralCodeType.STANDARD,
        description: 'Home Connect - Keep in touch with loved ones',
        bonusCommissionRate: 2.0,
        maxUses: null,
        currentUses: 67,
      },
      {
        code: 'AFRICANPRIDE',
        type: ReferralCodeType.PROMOTIONAL,
        description: 'African Pride - Supporting families across the continent',
        bonusCommissionRate: 4.0,
        maxUses: 150,
        currentUses: 34,
      },
    ];

    for (let i = 0; i < agents.length && i < planetTalkCodes.length; i++) {
      const codeData = planetTalkCodes[i];
      const referralCode = this.referralCodesRepository.create({
        ...codeData,
        agentId: agents[i].id,
        status: ReferralCodeStatus.ACTIVE,
        expiresAt: new Date('2024-12-31'),
        lastUsedAt: new Date(),
        metadata: {
          createdBy: 'planettalk-seeder',
          isTestData: true,
          targetMarket: 'diaspora-community',
          baseCommissionAmount: 25.00, // $25 per customer signup
          commissionPeriod: '24 months',
        },
      });
      referralCodes.push(referralCode);
    }

    return this.referralCodesRepository.save(referralCodes);
  }

  private async createAirtimeCommissions(agents: Agent[], referralCodes: ReferralCode[]): Promise<AgentEarnings[]> {
    const earnings = [];

    for (const agent of agents) {
      const agentEarnings = [];
      const commissionRate = parseFloat(agent.commissionRate.toString());

      // Generate 6 months of airtime commission history
      for (let month = 5; month >= 0; month--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - month);
        
        // Monthly customer referrals (each customer tops up multiple times)
        const customersThisMonth = Math.floor(Math.random() * 8) + 3; // 3-10 customers
        
        for (let customer = 0; customer < customersThisMonth; customer++) {
          // Each customer does multiple top-ups per month for 24 months
          const topupsThisMonth = Math.floor(Math.random() * 6) + 2; // 2-7 top-ups per customer
          
          for (let topup = 0; topup < topupsThisMonth; topup++) {
            const topupAmount = [10, 15, 20, 25, 30, 50][Math.floor(Math.random() * 6)]; // Common airtime amounts
            const commission = topupAmount * (commissionRate / 100);
            
            agentEarnings.push({
              type: EarningType.REFERRAL_COMMISSION,
              status: month === 0 && topup >= topupsThisMonth - 1 ? EarningStatus.PENDING : EarningStatus.CONFIRMED,
              amount: Math.round(commission * 100) / 100,
              currency: 'USD',
              commissionRate: commissionRate,
              description: `${this.getRandomCountryAirtime()} - Customer ${customer + 1} top-up ($${topupAmount})`,
              referenceId: `AIRTIME-${agent.agentCode}-${monthDate.getFullYear()}${String(monthDate.getMonth() + 1).padStart(2, '0')}-C${customer + 1}-T${topup + 1}`,
              earnedAt: new Date(monthDate.getTime() + (customer * 7 + topup * 2) * 24 * 60 * 60 * 1000), // Spread throughout month
              confirmedAt: month === 0 && topup >= topupsThisMonth - 1 ? null : new Date(monthDate.getTime() + (customer * 7 + topup * 2) * 24 * 60 * 60 * 1000 + (24 * 60 * 60 * 1000)),
            });
          }
        }

        // Monthly community bonuses
        if (this.shouldReceiveCommunityBonus(agent.tier, month)) {
          agentEarnings.push({
            type: EarningType.BONUS,
            status: EarningStatus.CONFIRMED,
            amount: this.getCommunityBonusAmount(agent.tier),
            currency: 'USD',
            commissionRate: null,
            description: this.getRandomCommunityBonus(),
            referenceId: `COMMUNITY-${agent.agentCode}-${monthDate.getFullYear()}${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
            earnedAt: new Date(monthDate.getFullYear(), monthDate.getMonth(), 28),
            confirmedAt: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1),
          });
        }
      }

      // Create database records
      for (const earning of agentEarnings) {
        const agentEarning = this.earningsRepository.create({
          agentId: agent.id,
          ...earning,
          metadata: {
            createdBy: 'planettalk-seeder',
            isTestData: true,
            program: 'PlanetTalk Diaspora Agent',
            businessModel: 'airtime-referral',
          },
        });
        earnings.push(agentEarning);
      }

      // Update agent balances
      const confirmedEarnings = agentEarnings.filter(e => e.status === EarningStatus.CONFIRMED);
      const pendingEarnings = agentEarnings.filter(e => e.status === EarningStatus.PENDING);
      
      const totalEarnings = confirmedEarnings.reduce((sum, e) => sum + e.amount, 0);
      const pendingAmount = pendingEarnings.reduce((sum, e) => sum + e.amount, 0);
      const availableBalance = totalEarnings * 0.6; // 40% already paid out

      agent.totalEarnings = Math.round(totalEarnings * 100) / 100;
      agent.availableBalance = Math.round(availableBalance * 100) / 100;
      agent.pendingBalance = Math.round(pendingAmount * 100) / 100;
      agent.totalReferrals = agentEarnings.filter(e => e.type === EarningType.REFERRAL_COMMISSION).length;
      agent.activeReferrals = agentEarnings.filter(e => e.type === EarningType.REFERRAL_COMMISSION && e.status === EarningStatus.CONFIRMED).length;
      
      await this.agentsRepository.save(agent);

      this.logger.log(`📱 Agent ${agent.agentCode}: $${agent.totalEarnings} total, ${agent.totalReferrals} airtime referrals`);
    }

    return this.earningsRepository.save(earnings);
  }

  private async createAirtimePayouts(agents: Agent[]): Promise<Payout[]> {
    const payouts = [];
    const airtimePayouts = [
      {
        amount: 25.00,
        method: PayoutMethod.PLANETTALK_CREDIT,
        description: 'Weekly PlanetTalk credit allowance',
        status: PayoutStatus.APPROVED,
        paymentDetails: {
          planettalkCredit: {
            planettalkMobile: '+233244567890',
            accountName: 'Kwame Asante',
          },
        },
      },
      {
        amount: 150.00,
        method: PayoutMethod.BANK_TRANSFER,
        description: 'Monthly commission payout',
        status: PayoutStatus.PENDING,
        paymentDetails: {
          bankAccount: {
            accountNumber: '1234567890',
            routingNumber: '123456789',
            accountName: 'Grace Wanjiku',
            bankName: 'Kenya Commercial Bank',
          },
        },
      },
      {
        amount: 45.00,
        method: PayoutMethod.PLANETTALK_CREDIT,
        description: 'Bi-weekly PlanetTalk credit payout',
        status: PayoutStatus.PENDING,
        paymentDetails: {
          planettalkCredit: {
            planettalkMobile: '+263771234567',
            accountName: 'Thandiwe Moyo',
          },
        },
      },
    ];

    for (let i = 0; i < Math.min(agents.length, airtimePayouts.length); i++) {
      const payoutData = airtimePayouts[i];
      const payout = this.payoutsRepository.create({
        agentId: agents[i].id,
        ...payoutData,
        requestedAt: new Date(),
        metadata: {
          createdBy: 'planettalk-seeder',
          isTestData: true,
          businessModel: 'airtime-commission',
        },
      });
      payouts.push(payout);
    }

    return this.payoutsRepository.save(payouts);
  }

  private getRandomCountryAirtime(): string {
    const countries = [
      'Nigeria MTN Airtime',
      'Kenya Safaricom Airtime',
      'Ghana MTN Airtime',
      'Zimbabwe Econet Airtime',
      'South Africa Vodacom Airtime',
      'Uganda MTN Airtime',
      'Tanzania Vodacom Airtime',
      'Zambia MTN Airtime',
      'Rwanda MTN Airtime',
      'Botswana Orange Airtime',
      'Senegal Orange Airtime',
      'Cameroon MTN Airtime',
    ];
    return countries[Math.floor(Math.random() * countries.length)];
  }

  private shouldReceiveCommunityBonus(tier: AgentTier, month: number): boolean {
    const chances = {
      [AgentTier.BRONZE]: 0.3,   // 30% chance
      [AgentTier.SILVER]: 0.5,   // 50% chance
      [AgentTier.GOLD]: 0.7,     // 70% chance
      [AgentTier.PLATINUM]: 0.9, // 90% chance
    };
    return Math.random() < (chances[tier] || 0.3);
  }

  private getCommunityBonusAmount(tier: AgentTier): number {
    const bonuses = {
      [AgentTier.BRONZE]: Math.round((Math.random() * 50 + 25) * 100) / 100,   // $25-75
      [AgentTier.SILVER]: Math.round((Math.random() * 100 + 50) * 100) / 100,  // $50-150
      [AgentTier.GOLD]: Math.round((Math.random() * 200 + 100) * 100) / 100,   // $100-300
      [AgentTier.PLATINUM]: Math.round((Math.random() * 400 + 200) * 100) / 100, // $200-600
    };
    return bonuses[tier] || 25;
  }

  private getRandomCommunityBonus(): string {
    const bonuses = [
      'Community Growth Bonus',
      'Diaspora Impact Award',
      'Family Connection Bonus',
      'Network Expansion Reward',
      'Customer Retention Bonus',
      'Monthly Ambassador Bonus',
      'Community Leader Award',
      'Referral Champion Bonus',
    ];
    return bonuses[Math.floor(Math.random() * bonuses.length)];
  }

  private async generateAgentCode(): Promise<string> {
    let agentCode: string;
    let isUnique = false;

    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      agentCode = `PTA${randomNum}`;
      const existing = await this.agentsRepository.findOne({ where: { agentCode } });
      isUnique = !existing;
    }

    return agentCode;
  }
}
