import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Agent, AgentTier } from '../../modules/agents/entities/agent.entity';
import { AgentEarnings, EarningType, EarningStatus } from '../../modules/agents/entities/agent-earnings.entity';

@Injectable()
export class RewardsSeeder {
  private readonly logger = new Logger(RewardsSeeder.name);

  constructor(
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
    @InjectRepository(AgentEarnings)
    private earningsRepository: Repository<AgentEarnings>,
  ) {}

  async seedRewards(): Promise<void> {
    this.logger.log('🎁 Starting rewards seeding for all existing agents...');

    try {
      // Get all existing agents
      const agents = await this.agentsRepository.find();
      
      if (agents.length === 0) {
        this.logger.warn('⚠️ No agents found. Please run the main seeder first.');
        return;
      }

      this.logger.log(`🎯 Found ${agents.length} agents - generating rewards for each...`);

      const allEarnings = [];

      for (const agent of agents) {
        this.logger.log(`💰 Creating rewards for Agent ${agent.agentCode} (${agent.tier} tier)`);

        // Clear existing earnings for clean slate
        await this.earningsRepository.delete({ agentId: agent.id });

        const agentEarnings = [];
        
        // Performance tier determines reward frequency and amounts
        const performanceMultiplier = this.getPerformanceMultiplier(agent.tier);
        const baseCommissionRate = parseFloat(agent.commissionRate.toString());

        // Generate 6 months of earnings history
        for (let month = 5; month >= 0; month--) {
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - month);
          
          // Monthly referral commissions
          const referralCount = this.getMonthlyReferrals(agent.tier);
          
          for (let ref = 0; ref < referralCount; ref++) {
            const baseAmount = this.getRandomCommissionBase(agent.tier);
            const commissionAmount = baseAmount * (baseCommissionRate / 100);
            
            agentEarnings.push({
              type: EarningType.REFERRAL_COMMISSION,
              status: month === 0 && ref >= referralCount - 2 ? EarningStatus.PENDING : EarningStatus.CONFIRMED,
              amount: Math.round(commissionAmount * 100) / 100,
              currency: 'USD',
              commissionRate: baseCommissionRate,
              description: `${this.getRandomAirtimeType()}`,
              referenceId: `REF-${agent.agentCode}-${monthDate.getFullYear()}${String(monthDate.getMonth() + 1).padStart(2, '0')}${String(ref + 1).padStart(2, '0')}`,
              earnedAt: new Date(monthDate.getTime() + (ref * 3 * 24 * 60 * 60 * 1000)), // Every 3 days
              confirmedAt: month === 0 && ref >= referralCount - 2 ? null : new Date(monthDate.getTime() + (ref * 3 * 24 * 60 * 60 * 1000) + (24 * 60 * 60 * 1000)),
            });
          }

          // Performance bonuses (monthly)
          if (this.shouldReceiveMonthlyBonus(agent.tier, month)) {
            const bonusAmount = this.getMonthlyBonusAmount(agent.tier);
            agentEarnings.push({
              type: EarningType.BONUS,
              status: EarningStatus.CONFIRMED,
              amount: bonusAmount,
              currency: 'USD',
              commissionRate: null,
              description: this.getRandomBonusDescription(),
              referenceId: `BONUS-${agent.agentCode}-${monthDate.getFullYear()}${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
              earnedAt: new Date(monthDate.getFullYear(), monthDate.getMonth(), 28),
              confirmedAt: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1),
            });
          }

          // Quarterly incentives
          if (month % 3 === 0 && month < 5) { // Every 3 months, but not this month
            const quarterlyBonus = this.getQuarterlyBonusAmount(agent.tier);
            agentEarnings.push({
              type: EarningType.BONUS,
              status: EarningStatus.CONFIRMED,
              amount: quarterlyBonus,
              currency: 'USD',
              commissionRate: null,
              description: `Q${Math.ceil((monthDate.getMonth() + 1) / 3)} Performance Incentive`,
              referenceId: `Q${Math.ceil((monthDate.getMonth() + 1) / 3)}-${agent.agentCode}-${monthDate.getFullYear()}`,
              earnedAt: new Date(monthDate.getFullYear(), monthDate.getMonth(), 28),
              confirmedAt: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1),
            });
          }
        }

        // Add special achievement rewards
        agentEarnings.push(...this.generateSpecialAchievements(agent));

        // Add occasional adjustments
        if (Math.random() > 0.8) { // 20% chance of adjustment
          const adjustmentAmount = Math.random() > 0.7 ? 
            Math.round((Math.random() * 150 + 50) * 100) / 100 : // Positive
            -Math.round((Math.random() * 75 + 25) * 100) / 100;   // Negative
            
          agentEarnings.push({
            type: EarningType.ADJUSTMENT,
            status: EarningStatus.CONFIRMED,
            amount: adjustmentAmount,
            currency: 'USD',
            commissionRate: null,
            description: adjustmentAmount > 0 ? 'Special achievement bonus' : 'Processing fee adjustment',
            referenceId: `ADJ-${agent.agentCode}-${new Date().getTime()}`,
            earnedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
            confirmedAt: new Date(Date.now() - Math.floor(Math.random() * 25) * 24 * 60 * 60 * 1000),
          });
        }

        // Create database records
        for (const earning of agentEarnings) {
          const agentEarning = this.earningsRepository.create({
            agentId: agent.id,
            ...earning,
            metadata: {
              createdBy: 'rewards-seeder',
              isTestData: true,
              agentTier: agent.tier,
              seedDate: new Date().toISOString(),
            },
          });
          allEarnings.push(agentEarning);
        }

        // Calculate and update agent balances
        const confirmedEarnings = agentEarnings.filter(e => e.status === EarningStatus.CONFIRMED);
        const pendingEarnings = agentEarnings.filter(e => e.status === EarningStatus.PENDING);
        
        const totalEarnings = confirmedEarnings.reduce((sum, e) => sum + e.amount, 0);
        const pendingAmount = pendingEarnings.reduce((sum, e) => sum + e.amount, 0);
        
        // Realistic available balance (some money already paid out)
        const payoutRate = this.getPayoutRate(agent.tier);
        const availableBalance = Math.max(0, totalEarnings * payoutRate);

        agent.totalEarnings = Math.round(totalEarnings * 100) / 100;
        agent.availableBalance = Math.round(availableBalance * 100) / 100;
        agent.pendingBalance = Math.round(pendingAmount * 100) / 100;
        
        const referralCommissions = agentEarnings.filter(e => e.type === EarningType.REFERRAL_COMMISSION);
        agent.totalReferrals = referralCommissions.length;
        agent.activeReferrals = referralCommissions.filter(e => e.status === EarningStatus.CONFIRMED).length;
        
        await this.agentsRepository.save(agent);

        this.logger.log(`✅ Agent ${agent.agentCode}: $${agent.totalEarnings.toFixed(2)} total, $${agent.availableBalance.toFixed(2)} available, ${agentEarnings.length} rewards`);
      }

      // Save all earnings
      await this.earningsRepository.save(allEarnings);

      this.logger.log(`🎉 Successfully created ${allEarnings.length} reward records for ${agents.length} agents!`);
      
      // Summary by tier
      const tierSummary: Record<string, { count: number; totalEarnings: number }> = {};
      for (const agent of agents) {
        if (!tierSummary[agent.tier]) {
          tierSummary[agent.tier] = { count: 0, totalEarnings: 0 };
        }
        tierSummary[agent.tier].count++;
        tierSummary[agent.tier].totalEarnings += parseFloat(agent.totalEarnings.toString());
      }

      this.logger.log('📊 Rewards Summary by Tier:');
      for (const [tier, stats] of Object.entries(tierSummary)) {
        this.logger.log(`   ${tier}: ${stats.count} agents, $${stats.totalEarnings.toFixed(2)} total earnings`);
      }

    } catch (error) {
      this.logger.error('❌ Rewards seeding failed:', error);
      throw error;
    }
  }

  private getPerformanceMultiplier(tier: AgentTier): number {
    const multipliers = {
      [AgentTier.BRONZE]: 1.0,
      [AgentTier.SILVER]: 1.3,
      [AgentTier.GOLD]: 1.6,
      [AgentTier.PLATINUM]: 2.0,
    };
    return multipliers[tier] || 1.0;
  }

  private getMonthlyReferrals(tier: AgentTier): number {
    const baseCounts = {
      [AgentTier.BRONZE]: Math.floor(Math.random() * 4) + 2,    // 2-6
      [AgentTier.SILVER]: Math.floor(Math.random() * 6) + 4,    // 4-10
      [AgentTier.GOLD]: Math.floor(Math.random() * 8) + 6,      // 6-14
      [AgentTier.PLATINUM]: Math.floor(Math.random() * 10) + 8, // 8-18
    };
    return baseCounts[tier] || 2;
  }

  private getRandomCommissionBase(tier: AgentTier): number {
    const amounts = {
      [AgentTier.BRONZE]: [75, 100, 125, 150, 175],
      [AgentTier.SILVER]: [100, 150, 200, 250, 300],
      [AgentTier.GOLD]: [150, 200, 300, 400, 500],
      [AgentTier.PLATINUM]: [200, 350, 500, 750, 1000],
    };
    
    const tierAmounts = amounts[tier] || amounts[AgentTier.BRONZE];
    return tierAmounts[Math.floor(Math.random() * tierAmounts.length)];
  }

  private getRandomAirtimeType(): string {
    const types = [
      'Nigeria Airtime Commission',
      'Kenya Airtime Commission',
      'Zimbabwe Airtime Commission',
      'Ghana Airtime Commission',
      'South Africa Airtime Commission',
      'Uganda Airtime Commission',
      'Tanzania Airtime Commission',
      'Zambia Airtime Commission',
      'Rwanda Airtime Commission',
      'Botswana Airtime Commission',
      'International Airtime Commission',
      'Mobile Money Transfer Commission',
      'Data Bundle Commission',
      'Diaspora Connection Commission',
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  private shouldReceiveMonthlyBonus(tier: AgentTier, month: number): boolean {
    const chances = {
      [AgentTier.BRONZE]: 0.2,   // 20% chance
      [AgentTier.SILVER]: 0.4,   // 40% chance
      [AgentTier.GOLD]: 0.6,     // 60% chance
      [AgentTier.PLATINUM]: 0.8, // 80% chance
    };
    return Math.random() < (chances[tier] || 0.2);
  }

  private getMonthlyBonusAmount(tier: AgentTier): number {
    const bonuses = {
      [AgentTier.BRONZE]: Math.round((Math.random() * 100 + 50) * 100) / 100,   // $50-150
      [AgentTier.SILVER]: Math.round((Math.random() * 200 + 100) * 100) / 100,  // $100-300
      [AgentTier.GOLD]: Math.round((Math.random() * 400 + 200) * 100) / 100,    // $200-600
      [AgentTier.PLATINUM]: Math.round((Math.random() * 600 + 400) * 100) / 100, // $400-1000
    };
    return bonuses[tier] || 50;
  }

  private getQuarterlyBonusAmount(tier: AgentTier): number {
    const bonuses = {
      [AgentTier.BRONZE]: Math.round((Math.random() * 200 + 100) * 100) / 100,   // $100-300
      [AgentTier.SILVER]: Math.round((Math.random() * 400 + 200) * 100) / 100,   // $200-600
      [AgentTier.GOLD]: Math.round((Math.random() * 800 + 400) * 100) / 100,     // $400-1200
      [AgentTier.PLATINUM]: Math.round((Math.random() * 1200 + 800) * 100) / 100, // $800-2000
    };
    return bonuses[tier] || 100;
  }

  private getRandomBonusDescription(): string {
    const descriptions = [
      'Monthly Referral Bonus',
      'Community Growth Achievement',
      'Customer Retention Award',
      'Diaspora Connection Bonus',
      'Top Referrer Bonus',
      'Network Expansion Bonus',
      'Customer Satisfaction Bonus',
      'Monthly Top-up Volume Bonus',
      'Community Impact Award',
      'PlanetTalk Ambassador Bonus',
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private generateSpecialAchievements(agent: Agent): any[] {
    const achievements = [];
    const now = new Date();

    // Anniversary bonus (if agent been active > 1 year)
    if (agent.activatedAt && (now.getTime() - new Date(agent.activatedAt).getTime()) > 365 * 24 * 60 * 60 * 1000) {
      achievements.push({
        type: EarningType.BONUS,
        status: EarningStatus.CONFIRMED,
        amount: this.getAnniversaryBonus(agent.tier),
        currency: 'USD',
        commissionRate: null,
        description: 'Agent Anniversary Milestone',
        referenceId: `ANNIVERSARY-${agent.agentCode}-${now.getFullYear()}`,
        earnedAt: new Date(new Date(agent.activatedAt).getTime() + 365 * 24 * 60 * 60 * 1000),
        confirmedAt: new Date(new Date(agent.activatedAt).getTime() + 366 * 24 * 60 * 60 * 1000),
      });
    }

    // Training completion bonuses
    const trainingBonuses = Math.floor(Math.random() * 3) + 1; // 1-3 training bonuses
    for (let i = 0; i < trainingBonuses; i++) {
      achievements.push({
        type: EarningType.BONUS,
        status: EarningStatus.CONFIRMED,
        amount: this.getTrainingBonusAmount(agent.tier),
        currency: 'USD',
        commissionRate: null,
        description: this.getRandomTrainingType(),
        referenceId: `TRAINING-${agent.agentCode}-${now.getFullYear()}-${i + 1}`,
        earnedAt: new Date(now.getTime() - Math.floor(Math.random() * 120) * 24 * 60 * 60 * 1000),
        confirmedAt: new Date(now.getTime() - Math.floor(Math.random() * 115) * 24 * 60 * 60 * 1000),
      });
    }

    // Referral recruitment bonus (if high tier)
    if ([AgentTier.GOLD, AgentTier.PLATINUM].includes(agent.tier) && Math.random() > 0.6) {
      achievements.push({
        type: EarningType.BONUS,
        status: EarningStatus.CONFIRMED,
        amount: this.getRecruitmentBonusAmount(agent.tier),
        currency: 'USD',
        commissionRate: null,
        description: 'New Agent Recruitment Bonus',
        referenceId: `RECRUIT-${agent.agentCode}-${now.getFullYear()}`,
        earnedAt: new Date(now.getTime() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000),
        confirmedAt: new Date(now.getTime() - Math.floor(Math.random() * 85) * 24 * 60 * 60 * 1000),
      });
    }

    return achievements;
  }

  private getAnniversaryBonus(tier: AgentTier): number {
    const bonuses = {
      [AgentTier.BRONZE]: 250,
      [AgentTier.SILVER]: 500,
      [AgentTier.GOLD]: 750,
      [AgentTier.PLATINUM]: 1000,
    };
    return bonuses[tier] || 250;
  }

  private getTrainingBonusAmount(tier: AgentTier): number {
    const bonuses = {
      [AgentTier.BRONZE]: Math.round((Math.random() * 50 + 25) * 100) / 100,   // $25-75
      [AgentTier.SILVER]: Math.round((Math.random() * 75 + 50) * 100) / 100,   // $50-125
      [AgentTier.GOLD]: Math.round((Math.random() * 100 + 75) * 100) / 100,    // $75-175
      [AgentTier.PLATINUM]: Math.round((Math.random() * 150 + 100) * 100) / 100, // $100-250
    };
    return bonuses[tier] || 25;
  }

  private getRandomTrainingType(): string {
    const trainings = [
      'Compliance Training Completion',
      'Sales Excellence Certification',
      'Customer Service Training',
      'Product Knowledge Certification',
      'Digital Marketing Training',
      'Risk Assessment Certification',
      'Advanced Sales Techniques',
      'Leadership Development Program',
      'Industry Regulations Update',
      'Professional Ethics Training',
    ];
    return trainings[Math.floor(Math.random() * trainings.length)];
  }

  private getRecruitmentBonusAmount(tier: AgentTier): number {
    const bonuses = {
      [AgentTier.GOLD]: Math.round((Math.random() * 200 + 150) * 100) / 100,     // $150-350
      [AgentTier.PLATINUM]: Math.round((Math.random() * 400 + 250) * 100) / 100, // $250-650
    };
    return bonuses[tier] || 150;
  }

  private getPayoutRate(tier: AgentTier): number {
    // Higher tiers tend to keep more money available (lower payout rate)
    const rates = {
      [AgentTier.BRONZE]: 0.8,     // 80% of earnings paid out
      [AgentTier.SILVER]: 0.7,     // 70% paid out
      [AgentTier.GOLD]: 0.6,       // 60% paid out  
      [AgentTier.PLATINUM]: 0.5,   // 50% paid out (keep more for reinvestment)
    };
    return rates[tier] || 0.8;
  }
}
