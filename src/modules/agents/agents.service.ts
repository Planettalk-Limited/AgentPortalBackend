import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Agent, AgentStatus, AgentTier } from './entities/agent.entity';
import { AgentApplication } from './entities/agent-application.entity';
import { ReferralCode, ReferralCodeType } from './entities/referral-code.entity';
import { ReferralUsage, ReferralUsageStatus } from './entities/referral-usage.entity';
import { AgentEarnings, EarningType, EarningStatus } from './entities/agent-earnings.entity';
import { Payout, PayoutStatus, PayoutMethod } from './entities/payout.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { CreateAgentApplicationDto } from './dto/create-agent-application.dto';
import { CreateReferralCodeDto } from './dto/create-referral-code.dto';
import { UseReferralCodeDto } from './dto/use-referral-code.dto';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';
import { UpdatePayoutStatusDto } from './dto/update-payout-status.dto';
import { CreateEarningAdjustmentDto, AdjustmentType } from './dto/create-earning-adjustment.dto';
import { BulkEarningsUploadDto, BulkEarningsUploadResultDto, EarningEntryDto } from './dto/bulk-earnings-upload.dto';
import { UpdateAgentEarningsDto, UpdateAgentReferralsDto, BulkUpdateEarningsDto, BulkUpdateReferralsDto, UpdateAgentStatsDto, BulkUpdateAgentStatsDto, UpdateAgentStatsByCodeDto, BulkUpdateAgentStatsByCodeDto } from './dto/update-agent-stats.dto';
import { EmailService } from '../email/email.service';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationPriority } from '../notifications/entities/notification.entity';
import { ApplicationStatus } from './entities/agent-application.entity';

@Injectable()
export class AgentsService {
  constructor(
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
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createAgentDto: CreateAgentDto): Promise<Agent> {
    // Generate unique agent code
    const agentCode = await this.generateAgentCode();
    
    const agent = this.agentsRepository.create({
      ...createAgentDto,
      agentCode,
    });

    return this.agentsRepository.save(agent);
  }

  async findAll(filters?: {
    status?: string;
    tier?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const { status, tier } = filters || {};
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 20;

    const queryBuilder = this.agentsRepository.createQueryBuilder('agent')
      .leftJoinAndSelect('agent.user', 'user');

    if (status) {
      queryBuilder.andWhere('agent.status = :status', { status });
    }

    if (tier) {
      queryBuilder.andWhere('agent.tier = :tier', { tier });
    }

    const total = await queryBuilder.getCount();
    const agents = await queryBuilder
      .orderBy('agent.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Calculate global metrics (unfiltered)
    const globalMetrics = await this.calculateAgentMetrics();

    return {
      agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      metrics: globalMetrics,
    };
  }

  /**
   * Calculate global agent metrics/statistics
   */
  private async calculateAgentMetrics(): Promise<any> {
    // Get total count
    const totalAgents = await this.agentsRepository.count();

    // Get counts by status
    const statusBreakdown = await this.agentsRepository
      .createQueryBuilder('agent')
      .select('agent.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('agent.status')
      .getRawMany();

    // Get counts by tier
    const tierBreakdown = await this.agentsRepository
      .createQueryBuilder('agent')
      .select('agent.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('agent.tier')
      .getRawMany();

    // Process status counts into a more usable format
    const statusMetrics = {
      active: 0,
      pending_application: 0,
      suspended: 0,
      inactive: 0,
    };

    statusBreakdown.forEach(row => {
      if (statusMetrics.hasOwnProperty(row.status)) {
        statusMetrics[row.status] = parseInt(row.count);
      }
    });

    // Process tier counts
    const tierMetrics = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    };

    tierBreakdown.forEach(row => {
      if (tierMetrics.hasOwnProperty(row.tier)) {
        tierMetrics[row.tier] = parseInt(row.count);
      }
    });

    // Calculate totals for summary
    const activeAgents = statusMetrics.active;
    const pendingAgents = statusMetrics.pending_application;
    const suspendedAgents = statusMetrics.suspended;
    const inactiveAgents = statusMetrics.inactive;

    return {
      overview: {
        totalAgents,
        activeAgents,
        pendingAgents,
        suspendedAgents,
        inactiveAgents,
      },
      statusBreakdown: statusMetrics,
      tierBreakdown: tierMetrics,
      statusSummary: {
        active: activeAgents,
        pending: pendingAgents,
        suspended: suspendedAgents,
        inactive: inactiveAgents,
      },
    };
  }

  async findById(id: string): Promise<Agent> {
    const agent = await this.agentsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return agent;
  }

  async findByAgentCode(agentCode: string): Promise<Agent | null> {
    return this.agentsRepository.findOne({
      where: { agentCode },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<Agent> {
    let agent = await this.agentsRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    // If no agent record exists but user is admin/pt_admin, create one automatically
    if (!agent) {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'status'],
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // If user is admin or pt_admin, create an agent record automatically
      if (user.role === 'admin' || user.role === 'pt_admin') {
        agent = await this.createAgentForAdminUser(userId, user);
      } else {
        throw new NotFoundException(`Agent with user ID ${userId} not found`);
      }
    }

    // Add monthly statistics to the agent object
    const monthlyStats = await this.calculateAgentMonthlyStats(agent.id);
    
    // Add monthly statistics as additional properties to the agent object
    (agent as any).earningsThisMonth = monthlyStats.earningsThisMonth;
    (agent as any).referralsThisMonth = monthlyStats.referralsThisMonth;
    
    return agent;
  }

  private async createAgentForAdminUser(userId: string, user: any): Promise<Agent> {
    // Generate unique agent code
    const agentCode = await this.generateAgentCode();
    
    const agent = this.agentsRepository.create({
      userId,
      agentCode,
      status: AgentStatus.ACTIVE,
      tier: AgentTier.PLATINUM, // Give admins platinum tier
      totalEarnings: 0,
      availableBalance: 0,
      pendingBalance: 0,
      totalReferrals: 0,
      activeReferrals: 0,
      commissionRate: 20.00, // Higher commission rate for admins
      notes: `Auto-created agent record for ${user.role}: ${user.firstName} ${user.lastName}`,
      activatedAt: new Date(),
      lastActivityAt: new Date(),
      metadata: {
        autoCreated: true,
        originalRole: user.role,
        createdAt: new Date().toISOString(),
      },
    });

    return this.agentsRepository.save(agent);
  }

  async update(id: string, updateAgentDto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.findById(id);
    Object.assign(agent, updateAgentDto);
    return this.agentsRepository.save(agent);
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findById(id);
    await this.agentsRepository.remove(agent);
  }

  // Agent Application Methods
  async submitApplication(createApplicationDto: CreateAgentApplicationDto): Promise<AgentApplication> {
    const application = this.applicationsRepository.create({
      ...createApplicationDto,
      submittedAt: new Date(),
      status: ApplicationStatus.SUBMITTED,
    });

    const savedApplication = await this.applicationsRepository.save(application);

    // Send acknowledgment email
    await this.emailService.sendAgentApplicationAcknowledgment(
      application.email,
      application.firstName,
      application.lastName
    );

    return savedApplication;
  }

  async getApplications(status?: string): Promise<AgentApplication[]> {
    const queryBuilder = this.applicationsRepository.createQueryBuilder('application')
      .leftJoinAndSelect('application.agent', 'agent')
      .leftJoinAndSelect('application.reviewer', 'reviewer');

    if (status) {
      queryBuilder.where('application.status = :status', { status });
    }

    return queryBuilder.orderBy('application.submittedAt', 'DESC').getMany();
  }

  async getApplicationById(id: string): Promise<AgentApplication> {
    const application = await this.applicationsRepository.findOne({
      where: { id },
      relations: ['agent', 'reviewer'],
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    return application;
  }

  async reviewApplication(
    id: string,
    reviewData: { status: string; reviewNotes?: string; rejectionReason?: string; reviewedBy?: string }
  ): Promise<AgentApplication> {
    const application = await this.getApplicationById(id);
    
    application.status = reviewData.status as ApplicationStatus;
    application.reviewNotes = reviewData.reviewNotes;
    application.rejectionReason = reviewData.rejectionReason;
    application.reviewedAt = new Date();
    
    if (reviewData.reviewedBy) {
      application.reviewedBy = reviewData.reviewedBy;
    }

    return this.applicationsRepository.save(application);
  }

  // Referral Code Methods
  async createReferralCode(agentId: string, createReferralCodeDto: CreateReferralCodeDto): Promise<ReferralCode> {
    const agent = await this.findById(agentId);
    
    if (!agent.canGenerateReferralCode) {
      throw new BadRequestException('Agent cannot generate referral codes in current status');
    }

    let code = createReferralCodeDto.code;
    if (!code) {
      code = await this.generateReferralCode();
    } else {
      // Check if code already exists
      const existingCode = await this.referralCodesRepository.findOne({ where: { code } });
      if (existingCode) {
        throw new BadRequestException('Referral code already exists');
      }
    }

    const referralCode = this.referralCodesRepository.create({
      ...createReferralCodeDto,
      code,
      agentId,
    });

    return this.referralCodesRepository.save(referralCode);
  }

  async getAgentReferralCodes(agentId: string): Promise<ReferralCode[]> {
    const agent = await this.findById(agentId);
    
    return this.referralCodesRepository.find({
      where: { agentId },
      relations: ['usages'],
      order: { createdAt: 'DESC' },
    });
  }

  async useReferralCode(agentCode: string, useReferralCodeDto: UseReferralCodeDto): Promise<any> {
    // Use agent code directly as referral code
    const agent = await this.agentsRepository.findOne({
      where: { agentCode },
      relations: ['user'],
    });

    if (!agent) {
      throw new NotFoundException('Agent code not found');
    }

    if (agent.status !== AgentStatus.ACTIVE) {
      throw new BadRequestException('This agent is not currently active');
    }

    // Create usage record (simplified - no separate referral_codes table needed)
    const usage = this.referralUsageRepository.create({
      referredUserName: useReferralCodeDto.fullName,
      referredUserPhone: useReferralCodeDto.phoneNumber,
      referralCodeId: null, // Not using separate referral codes
      status: ReferralUsageStatus.CONFIRMED,
      usedAt: new Date(),
      confirmedAt: new Date(),
      metadata: {
        agentCode: agent.agentCode,
        referralMethod: 'agent_code',
        createdBy: 'referral-system',
        serviceType: 'Airtime Top-up', // Default service type
        signupAmount: 25.00, // Default signup amount
      },
    });

    const savedUsage = await this.referralUsageRepository.save(usage);

    // Update agent referral stats
    agent.totalReferrals += 1;
    agent.activeReferrals += 1;
    agent.lastActivityAt = new Date();
    await this.agentsRepository.save(agent);

    // Create automatic referral earnings
    await this.createAgentCodeEarnings(agent, savedUsage, useReferralCodeDto);

    return {
      success: true,
      id: savedUsage.id,
      agentCode: agent.agentCode,
      customerName: useReferralCodeDto.fullName,
      phoneNumber: useReferralCodeDto.phoneNumber,
      usedAt: savedUsage.usedAt,
      status: 'confirmed',
      message: `Success! Agent ${agent.user.firstName} ${agent.user.lastName} will earn commission from your airtime top-ups.`,
      agent: {
        agentCode: agent.agentCode,
        firstName: agent.user.firstName,
        lastName: agent.user.lastName,
        fullName: `${agent.user.firstName} ${agent.user.lastName}`,
        tier: agent.tier,
        commissionRate: agent.commissionRate,
      }
    };
  }

  // Agent Workflow Methods
  async approveAgent(id: string): Promise<Agent> {
    const agent = await this.findById(id);
    
    agent.status = AgentStatus.CODE_GENERATED;
    
    return this.agentsRepository.save(agent);
  }

  async sendCredentials(id: string): Promise<{ success: boolean; message: string; temporaryPassword?: string }> {
    const agent = await this.findById(id);
    
    if (agent.status !== AgentStatus.CODE_GENERATED) {
      throw new BadRequestException('Agent is not in the correct status to send credentials');
    }

    // Generate temporary password
    const temporaryPassword = crypto.randomBytes(8).toString('hex');
    const loginUrl = process.env.NODE_ENV === 'production' 
      ? 'https://portal.planettalk.com/en'
      : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/en` : 'http://localhost:3001/en');

    // Send credentials email
    const emailSent = await this.emailService.sendAgentCredentials(
      agent.user.email,
      agent.user.firstName,
      agent.agentCode,
      temporaryPassword,
      loginUrl
    );

    if (emailSent) {
      agent.status = AgentStatus.CREDENTIALS_SENT;
      // Store temporary password in metadata for validation
      agent.metadata = {
        ...agent.metadata,
        temporaryPassword: temporaryPassword, // In production, hash this
        credentialsSentAt: new Date().toISOString(),
      };
      await this.agentsRepository.save(agent);
    }

    return {
      success: emailSent,
      message: emailSent 
        ? 'Credentials sent successfully' 
        : 'Failed to send credentials email',
      // For development only - remove in production
      temporaryPassword: emailSent ? temporaryPassword : undefined,
    };
  }

  async activateAgent(id: string): Promise<Agent> {
    const agent = await this.findById(id);
    
    if (agent.status !== AgentStatus.CREDENTIALS_SENT) {
      throw new BadRequestException('Agent is not in the correct status to activate');
    }

    agent.status = AgentStatus.ACTIVE;
    agent.activatedAt = new Date();
    agent.lastActivityAt = new Date();
    
    return this.agentsRepository.save(agent);
  }

  // Earnings Methods
  async getAgentEarnings(agentId: string): Promise<AgentEarnings[]> {
    const agent = await this.findById(agentId);
    
    return this.earningsRepository.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAgentDashboard(agentId: string): Promise<any> {
    const agent = await this.findById(agentId);
    const earnings = await this.getAgentEarnings(agentId);
    const referralCodes = await this.getAgentReferralCodes(agentId);

    return {
      agent: {
        id: agent.id,
        agentCode: agent.agentCode,
        status: agent.status,
        tier: agent.tier,
        totalEarnings: agent.totalEarnings,
        availableBalance: agent.availableBalance,
        pendingBalance: agent.pendingBalance,
        totalReferrals: agent.totalReferrals,
        activeReferrals: agent.activeReferrals,
        commissionRate: agent.commissionRate,
        activatedAt: agent.activatedAt,
        lastActivityAt: agent.lastActivityAt,
      },
      earnings: earnings.slice(0, 10), // Latest 10 earnings
      referralCodes: referralCodes.slice(0, 5), // Latest 5 referral codes
      summary: {
        totalEarnings: agent.totalEarnings,
        monthlyEarnings: earnings
          .filter(e => e.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .reduce((sum, e) => sum + Number(e.amount), 0),
        totalReferrals: agent.totalReferrals,
        activeReferralCodes: referralCodes.filter(rc => rc.isActive).length,
      },
    };
  }

  private async generateReferralCode(): Promise<string> {
    let isUnique = false;
    let code: string;

    while (!isUnique) {
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      code = `REF${randomStr}`;
      
      const existingCode = await this.referralCodesRepository.findOne({ where: { code } });
      if (!existingCode) {
        isUnique = true;
      }
    }

    return code;
  }

  private async generateAgentCode(): Promise<string> {
    const prefix = 'AGT';
    let isUnique = false;
    let agentCode: string;

    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      agentCode = `${prefix}${randomNum}`;
      
      const existingAgent = await this.findByAgentCode(agentCode);
      if (!existingAgent) {
        isUnique = true;
      }
    }

    return agentCode;
  }

  /**
   * Creates an agent with full referral data structure for user registration
   */
  async createAgentWithReferralData(user: User): Promise<any> {
    // Generate unique agent code
    const agentCode = await this.generateAgentCode();
    
    // Create agent with bronze tier and 15% commission rate
    const agent = this.agentsRepository.create({
      userId: user.id,
      agentCode,
      status: AgentStatus.ACTIVE, // Set as active for new registrations
      tier: AgentTier.BRONZE,
      totalEarnings: 0,
      availableBalance: 0,
      pendingBalance: 0,
      totalReferrals: 0,
      activeReferrals: 0,
      commissionRate: 15.00, // 15% commission as specified
      activatedAt: new Date(),
      lastActivityAt: new Date(),
    });

    const savedAgent = await this.agentsRepository.save(agent);

    // Build the complete referral data structure
    const fullName = `${user.firstName} ${user.lastName}`;
    const personalizedMessage = `Hi, my name is ${fullName}. Here is my PlanetTalk referral code! Use my agent code when you sign up and I'll earn commission every time you top up for the next 24 months. Help the diaspora connect and support their families back home without breaking the bank!`;

    const referralData = {
      valid: true,
      agent: {
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: fullName,
        agentCode: savedAgent.agentCode,
        tier: savedAgent.tier,
      },
      program: {
        title: "Become an Agent with PlanetTalk",
        subtitle: "Make some cash with PlanetTalk!",
        description: "Start earning commissions by bringing in new customers to PlanetTalk.",
        benefits: [
          "Receive commissions on each customer for 24 months from their first successful top-up",
          "Share your unique code with your network, they use it once and you earn commission every time they top up",
          "Help the diaspora connect and support their families back home without breaking the bank!"
        ]
      },
      personalizedMessage: personalizedMessage,
      codeDetails: {
        agentCode: savedAgent.agentCode,
        type: "agent_code",
        description: `${fullName}'s PlanetTalk referral code`,
        commissionRate: savedAgent.commissionRate.toString(),
        tier: savedAgent.tier,
        totalReferrals: savedAgent.totalReferrals,
        activeSince: savedAgent.activatedAt,
      },
      callToAction: {
        primary: "Sign up with this code to get started",
        secondary: "Your agent will earn commission on every top-up you make for 24 months",
        buttonText: "Use This Code"
      }
    };

    return {
      agent: savedAgent,
      referralData: referralData
    };
  }

  /**
   * Creates a pending agent profile during registration
   */
  async createPendingAgentWithReferralData(user: User): Promise<any> {
    // Generate unique agent code
    const agentCode = await this.generateAgentCode();
    
    // Create agent in PENDING status
    const agent = this.agentsRepository.create({
      userId: user.id,
      agentCode,
      status: AgentStatus.PENDING_APPLICATION, // Start as pending
      tier: AgentTier.BRONZE,
      totalEarnings: 0,
      availableBalance: 0,
      pendingBalance: 0,
      totalReferrals: 0,
      activeReferrals: 0,
      commissionRate: 15.00, // 15% commission as specified
      activatedAt: null, // Will be set on approval
      lastActivityAt: new Date(),
      metadata: {
        pendingVerification: true,
        registrationMethod: 'self_registration',
        createdAt: new Date().toISOString(),
      },
    });

    const savedAgent = await this.agentsRepository.save(agent);

    return {
      agent: savedAgent,
      agentCode: savedAgent.agentCode,
      status: 'pending_verification'
    };
  }

  /**
   * Activate agent on first successful login
   */
  async activateAgentOnFirstLogin(user: User): Promise<any> {
    const agent = await this.agentsRepository.findOne({
      where: { userId: user.id },
    });

    if (!agent) {
      throw new NotFoundException('Agent profile not found');
    }

    // Activate the agent
    agent.status = AgentStatus.ACTIVE;
    agent.activatedAt = new Date();
    agent.lastActivityAt = new Date();
    agent.metadata = {
      ...agent.metadata,
      pendingVerification: false,
      activatedAt: new Date().toISOString(),
      activatedBy: 'first_login',
    };

    const savedAgent = await this.agentsRepository.save(agent);

    // Build the complete referral data structure
    const fullName = `${user.firstName} ${user.lastName}`;
    const personalizedMessage = `Hi, my name is ${fullName}. Here is my PlanetTalk referral code! Use my agent code when you sign up and I'll earn commission every time you top up for the next 24 months. Help the diaspora connect and support their families back home without breaking the bank!`;

    const referralData = {
      valid: true,
      agent: {
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: fullName,
        agentCode: savedAgent.agentCode,
        tier: savedAgent.tier,
      },
      program: {
        title: "Become an Agent with PlanetTalk",
        subtitle: "Make some cash with PlanetTalk!",
        description: "Start earning commissions by bringing in new customers to PlanetTalk.",
        benefits: [
          "Receive commissions on each customer for 24 months from their first successful top-up",
          "Share your unique code with your network, they use it once and you earn commission every time they top up",
          "Help the diaspora connect and support their families back home without breaking the bank!"
        ]
      },
      personalizedMessage: personalizedMessage,
      codeDetails: {
        agentCode: savedAgent.agentCode,
        type: "agent_code",
        description: `${fullName}'s PlanetTalk referral code`,
        commissionRate: savedAgent.commissionRate.toString(),
        tier: savedAgent.tier,
        totalReferrals: savedAgent.totalReferrals,
        activeSince: savedAgent.activatedAt,
      },
      callToAction: {
        primary: "Sign up with this code to get started",
        secondary: "Your agent will earn commission on every top-up you make for 24 months",
        buttonText: "Use This Code"
      }
    };

    return {
      agent: savedAgent,
      referralData: referralData
    };
  }

  /**
   * Send agent welcome email with complete details
   */
  async sendAgentWelcomeEmail(user: User, agent: Agent): Promise<void> {
    const emailData = {
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      username: user.email, // Email is the username
      agentCode: agent.agentCode,
      commissionRate: agent.commissionRate.toString(),
      tier: agent.tier,
      minimumPayout: '3', // Default minimum payout
      payoutProcessing: 'Monthly on the 15th',
      loginUrl: process.env.NODE_ENV === 'production' 
        ? 'https://portal.planettalk.com/en'
        : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/en` : 'http://localhost:3001/en'),
      supportEmail: 'support@planettalk.com',
      supportPhone: '+1-800-PLANET-TALK',
    };

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Welcome to PlanetTalk Agent Program!',
      template: 'agent-credentials',
      templateData: emailData,
    });

    console.log(`Welcome email sent to ${user.email} for agent ${agent.agentCode}`);
  }

  async validateReferralCode(agentCode: string): Promise<{ valid: boolean; agent?: any; details?: any; message?: string }> {
    // Use agent code directly as referral code
    const agent = await this.agentsRepository.findOne({
      where: { agentCode },
      relations: ['user'],
    });

    if (!agent) {
      return { 
        valid: false,
        message: 'Agent code not found.'
      };
    }

    if (agent.status !== AgentStatus.ACTIVE) {
      return { 
        valid: false,
        message: 'This agent is not currently active.',
        details: { 
          reason: 'Agent is not active',
          status: agent.status,
        }
      };
    }

    const agentFullName = `${agent.user.firstName} ${agent.user.lastName}`;
    const personalizedMessage = this.generateAgentCodeMessage(agentFullName);

    return {
      valid: true,
      agent: {
        agentCode: agent.agentCode,
        firstName: agent.user.firstName,
        lastName: agent.user.lastName,
        fullName: agentFullName,
        tier: agent.tier,
        commissionRate: agent.commissionRate,
      },
      details: {
        type: 'agent_code',
        description: `${agentFullName}'s PlanetTalk referral code`,
        commissionRate: agent.commissionRate,
        tier: agent.tier,
        status: agent.status,
        activeSince: agent.activatedAt,
        totalReferrals: agent.totalReferrals,
        activeReferrals: agent.activeReferrals,
      },
      message: personalizedMessage,
    };
  }

  // Payout Methods
  async requestPayout(agentId: string, createPayoutRequestDto: CreatePayoutRequestDto): Promise<Payout> {
    const agent = await this.findById(agentId);
    
    // Check if agent has sufficient balance
    if (agent.availableBalance < createPayoutRequestDto.amount) {
      throw new BadRequestException('Insufficient available balance for payout request');
    }

    // Validate payout method and payment details
    this.validatePayoutMethod(createPayoutRequestDto.method, createPayoutRequestDto.paymentDetails);

    // Removed restriction on multiple pending payouts - agents can now have multiple pending requests

    const payout = this.payoutsRepository.create({
      ...createPayoutRequestDto,
      agentId,
      netAmount: createPayoutRequestDto.amount, // Will be adjusted when fees are calculated
      requestedAt: new Date(),
      status: PayoutStatus.PENDING,
    });

    const savedPayout = await this.payoutsRepository.save(payout);

    // Update agent balance (move from available to pending)
    agent.availableBalance -= createPayoutRequestDto.amount;
    agent.pendingBalance += createPayoutRequestDto.amount;
    await this.agentsRepository.save(agent);

    // Send payout request email notification
    try {
      await this.sendPayoutRequestEmail(agent, savedPayout);
    } catch (error) {
      console.error('Failed to send payout request email:', error);
      // Don't fail the payout request if email fails
    }

    return savedPayout;
  }

  async getAgentPayouts(agentId: string, status?: string): Promise<Payout[]> {
    const agent = await this.findById(agentId);
    
    const queryBuilder = this.payoutsRepository.createQueryBuilder('payout')
      .where('payout.agentId = :agentId', { agentId })
      .leftJoinAndSelect('payout.processor', 'processor');

    if (status) {
      queryBuilder.andWhere('payout.status = :status', { status });
    }

    return queryBuilder.orderBy('payout.requestedAt', 'DESC').getMany();
  }

  async getPayoutById(id: string): Promise<Payout> {
    const payout = await this.payoutsRepository.findOne({
      where: { id },
      relations: ['agent', 'agent.user', 'processor'],
    });

    if (!payout) {
      throw new NotFoundException(`Payout with ID ${id} not found`);
    }

    return payout;
  }

  async updatePayoutStatus(id: string, updatePayoutStatusDto: UpdatePayoutStatusDto): Promise<Payout> {
    const payout = await this.getPayoutById(id);
    const previousStatus = payout.status;

    // Validate payout status transition - enforce strict workflow
    this.validatePayoutStatusTransition(previousStatus, updatePayoutStatusDto.status);

    // Update payout details
    payout.status = updatePayoutStatusDto.status;
    payout.adminNotes = updatePayoutStatusDto.adminNotes;
    payout.reviewMessage = updatePayoutStatusDto.reviewMessage;
    payout.transactionId = updatePayoutStatusDto.transactionId;
    
    if (updatePayoutStatusDto.fees !== undefined) {
      payout.fees = updatePayoutStatusDto.fees;
      payout.netAmount = payout.amount - payout.fees;
    }

    // Update timestamps based on status
    const now = new Date();
    switch (updatePayoutStatusDto.status) {
      case PayoutStatus.APPROVED:
        payout.approvedAt = now;
        break;
    }

    const updatedPayout = await this.payoutsRepository.save(payout);

    // Update agent balances based on status change
    await this.updateAgentBalancesOnPayoutStatusChange(payout, previousStatus);

    // Send notification about payout status change
    await this.sendPayoutStatusNotification(updatedPayout, previousStatus);

    return updatedPayout;
  }

  // Removed cancelPayout method as CANCELLED status is no longer supported
  // Payouts can only be PENDING, APPROVED, REJECTED, or REVIEW

  async createEarningAdjustment(agentId: string, createAdjustmentDto: CreateEarningAdjustmentDto): Promise<AgentEarnings> {
    const agent = await this.findById(agentId);

    // Validate earnings adjustment to prevent negative balances
    this.validateEarningsAdjustment(agent, createAdjustmentDto.amount);

    const earning = this.earningsRepository.create({
      agentId,
      type: this.mapAdjustmentTypeToEarningType(createAdjustmentDto.type),
      amount: createAdjustmentDto.amount,
      description: createAdjustmentDto.reason,
      referenceId: createAdjustmentDto.referenceId,
      earnedAt: new Date(),
      status: EarningStatus.CONFIRMED,
      metadata: {
        adjustmentType: createAdjustmentDto.type,
        notes: createAdjustmentDto.notes,
        createdBy: 'admin', // In a real app, get from JWT token
      },
    });

    const savedEarning = await this.earningsRepository.save(earning);

    // Update agent balances
    if (createAdjustmentDto.amount > 0) {
      agent.totalEarnings += createAdjustmentDto.amount;
      agent.availableBalance += createAdjustmentDto.amount;
    } else {
      // Deduction - remove from available balance first, then total
      const deductionAmount = Math.abs(createAdjustmentDto.amount);
      if (agent.availableBalance >= deductionAmount) {
        agent.availableBalance -= deductionAmount;
      } else {
        agent.availableBalance = 0;
      }
      agent.totalEarnings = Math.max(0, agent.totalEarnings - deductionAmount);
    }

    await this.agentsRepository.save(agent);

    return savedEarning;
  }

  async getEarningsSummary(agentId: string): Promise<any> {
    const agent = await this.findById(agentId);
    const earnings = await this.earningsRepository.find({
      where: { agentId },
      order: { earnedAt: 'DESC' },
    });

    const payouts = await this.payoutsRepository.find({
      where: { agentId },
      order: { requestedAt: 'DESC' },
    });

    return {
      agent: {
        id: agent.id,
        agentCode: agent.agentCode,
        totalEarnings: agent.totalEarnings,
        availableBalance: agent.availableBalance,
        pendingBalance: agent.pendingBalance,
      },
      earnings: {
        total: earnings.reduce((sum, e) => sum + Number(e.amount), 0),
        byType: this.groupEarningsByType(earnings),
        recent: earnings.slice(0, 10),
      },
      payouts: {
        total: payouts.reduce((sum, p) => sum + Number(p.amount), 0),
        approved: payouts.filter(p => p.isApproved).reduce((sum, p) => sum + Number(p.amount), 0),
        pending: payouts.filter(p => p.isPending).reduce((sum, p) => sum + Number(p.amount), 0),
        byStatus: this.groupPayoutsByStatus(payouts),
        recent: payouts.slice(0, 10),
      },
    };
  }

  // Admin Methods
  async getAllPayouts(filters: { status?: string; method?: string; page?: number; limit?: number }): Promise<any> {
    const { status, method } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    
    const queryBuilder = this.payoutsRepository.createQueryBuilder('payout')
      .leftJoinAndSelect('payout.agent', 'agent')
      .leftJoinAndSelect('agent.user', 'user')
      .leftJoinAndSelect('payout.processor', 'processor');

    if (status) {
      queryBuilder.andWhere('payout.status = :status', { status });
    }

    if (method) {
      queryBuilder.andWhere('payout.method = :method', { method });
    }

    const total = await queryBuilder.getCount();
    const payouts = await queryBuilder
      .orderBy('payout.requestedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Calculate global metrics (unfiltered)
    const globalMetrics = await this.calculatePayoutMetrics();

    return {
      payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      metrics: globalMetrics,
    };
  }

  /**
   * Calculate global payout metrics/statistics
   */
  private async calculatePayoutMetrics(): Promise<any> {
    // Get counts by status
    const statusCounts = await this.payoutsRepository
      .createQueryBuilder('payout')
      .select('payout.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(payout.amount), 0)', 'totalAmount')
      .groupBy('payout.status')
      .getRawMany();

    // Get overall totals
    const overallTotals = await this.payoutsRepository
      .createQueryBuilder('payout')
      .select('COUNT(*)', 'totalPayouts')
      .addSelect('COALESCE(SUM(payout.amount), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(payout.netAmount), 0)', 'totalNetAmount')
      .addSelect('COALESCE(SUM(payout.fees), 0)', 'totalFees')
      .getRawOne();

    // Process status counts into a more usable format
    const statusMetrics = {
      requested: { count: 0, amount: 0 },
      pending_review: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      processing: { count: 0, amount: 0 },
      completed: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
      failed: { count: 0, amount: 0 },
    };

    statusCounts.forEach(row => {
      if (statusMetrics[row.status]) {
        statusMetrics[row.status] = {
          count: parseInt(row.count),
          amount: parseFloat(row.totalAmount),
        };
      }
    });

    // Calculate pending and completed totals
    const pendingStatuses = ['requested', 'pending_review', 'approved', 'processing'];
    const completedStatuses = ['completed'];
    const failedStatuses = ['rejected', 'cancelled', 'failed'];

    const pendingTotal = pendingStatuses.reduce((sum, status) => {
      return {
        count: sum.count + statusMetrics[status].count,
        amount: sum.amount + statusMetrics[status].amount,
      };
    }, { count: 0, amount: 0 });

    const completedTotal = completedStatuses.reduce((sum, status) => {
      return {
        count: sum.count + statusMetrics[status].count,
        amount: sum.amount + statusMetrics[status].amount,
      };
    }, { count: 0, amount: 0 });

    const failedTotal = failedStatuses.reduce((sum, status) => {
      return {
        count: sum.count + statusMetrics[status].count,
        amount: sum.amount + statusMetrics[status].amount,
      };
    }, { count: 0, amount: 0 });

    return {
      overview: {
        totalPayouts: parseInt(overallTotals.totalPayouts),
        totalAmount: parseFloat(overallTotals.totalAmount),
        totalNetAmount: parseFloat(overallTotals.totalNetAmount),
        totalFees: parseFloat(overallTotals.totalFees),
      },
      statusSummary: {
        pending: pendingTotal,
        completed: completedTotal,
        failed: failedTotal,
      },
      statusBreakdown: statusMetrics,
    };
  }

  /**
   * Calculate global earnings metrics/statistics
   */
  private async calculateEarningsMetrics(): Promise<any> {
    // Get counts by status
    const statusCounts = await this.earningsRepository
      .createQueryBuilder('earning')
      .select('earning.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(earning.amount), 0)', 'totalAmount')
      .groupBy('earning.status')
      .getRawMany();

    // Get overall totals
    const overallTotals = await this.earningsRepository
      .createQueryBuilder('earning')
      .select('COUNT(*)', 'totalEarnings')
      .addSelect('COALESCE(SUM(earning.amount), 0)', 'totalAmount')
      .getRawOne();

    // Process status counts into a more usable format
    const statusMetrics = {
      pending: { count: 0, amount: 0 },
      confirmed: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    };

    statusCounts.forEach(row => {
      if (statusMetrics[row.status]) {
        statusMetrics[row.status] = {
          count: parseInt(row.count),
          amount: parseFloat(row.totalAmount),
        };
      }
    });

    // Get earnings by commission rate (tier breakdown)
    const tierBreakdown = await this.earningsRepository
      .createQueryBuilder('earning')
      .leftJoin('earning.agent', 'agent')
      .select('agent.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(earning.amount), 0)', 'totalAmount')
      .groupBy('agent.tier')
      .getRawMany();

    const tierMetrics = {
      bronze: { count: 0, amount: 0 },
      silver: { count: 0, amount: 0 },
      gold: { count: 0, amount: 0 },
      platinum: { count: 0, amount: 0 },
      diamond: { count: 0, amount: 0 },
    };

    tierBreakdown.forEach(row => {
      if (tierMetrics[row.tier]) {
        tierMetrics[row.tier] = {
          count: parseInt(row.count),
          amount: parseFloat(row.totalAmount),
        };
      }
    });

    // Get recent earnings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEarnings = await this.earningsRepository
      .createQueryBuilder('earning')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(earning.amount), 0)', 'amount')
      .where('earning.earnedAt >= :date', { date: thirtyDaysAgo })
      .getRawOne();

    const pendingEarnings = statusMetrics.pending;
    const confirmedEarnings = statusMetrics.confirmed;
    const cancelledEarnings = statusMetrics.cancelled;

    return {
      overview: {
        totalEarnings: parseInt(overallTotals.totalEarnings),
        totalAmount: parseFloat(overallTotals.totalAmount),
        pendingEarnings: pendingEarnings.count,
        confirmedEarnings: confirmedEarnings.count,
        cancelledEarnings: cancelledEarnings.count,
      },
      statusSummary: {
        pending: pendingEarnings,
        confirmed: confirmedEarnings,
        cancelled: cancelledEarnings,
      },
      statusBreakdown: statusMetrics,
      tierBreakdown: tierMetrics,
      recentActivity: {
        last30Days: {
          count: parseInt(recentEarnings.count),
          amount: parseFloat(recentEarnings.amount),
        },
      },
    };
  }

  async getPendingPayouts(): Promise<Payout[]> {
    return this.payoutsRepository.find({
      where: { 
        status: PayoutStatus.PENDING 
      },
      relations: ['agent', 'agent.user'],
      order: { requestedAt: 'ASC' },
    });
  }

  async getPayoutStats(period?: string): Promise<any> {
    const dateFilter = this.getDateFilter(period);
    
    const queryBuilder = this.payoutsRepository.createQueryBuilder('payout');
    
    if (dateFilter) {
      queryBuilder.where('payout.requestedAt >= :startDate', { startDate: dateFilter });
    }

    const payouts = await queryBuilder.getMany();

    return {
      total: payouts.length,
      totalAmount: payouts.reduce((sum, p) => sum + Number(p.amount), 0),
      byStatus: this.groupPayoutsByStatus(payouts),
      byMethod: this.groupPayoutsByMethod(payouts),
      averageAmount: payouts.length > 0 ? payouts.reduce((sum, p) => sum + Number(p.amount), 0) / payouts.length : 0,
      averageProcessingTime: this.calculateAverageProcessingTime(payouts),
    };
  }

  async approvePayout(id: string, adminNotes?: string): Promise<Payout> {
    return this.updatePayoutStatus(id, {
      status: PayoutStatus.APPROVED,
      adminNotes,
    });
  }

  // Removed rejectPayout method as REJECTED status is no longer supported
  // Payouts can only be: PENDING, APPROVED, or REVIEW

  async reviewPayout(id: string, reviewMessage: string, adminNotes?: string): Promise<Payout> {
    return this.updatePayoutStatus(id, {
      status: PayoutStatus.REVIEW,
      reviewMessage,
      adminNotes,
    });
  }

  // Removed processPayout and completePayout methods as PROCESSING and COMPLETED statuses are no longer supported
  // In the new system, APPROVED is the final status - external processing is handled outside the system

  async bulkProcessPayouts(payoutIds: string[], action: string, options?: { 
    adminNotes?: string; 
    reviewMessage?: string;
    individualMessages?: { payoutId: string; reviewMessage: string }[];
  }): Promise<{ 
    success: number; 
    failed: number; 
    errors: any[];
    successfulPayouts: { payoutId: string; agentCode: string; amount: number; message: string }[];
    failedPayouts: { payoutId: string; error: string }[];
  }> {
    const results = { 
      success: 0, 
      failed: 0, 
      errors: [],
      successfulPayouts: [],
      failedPayouts: [],
    };

    for (const id of payoutIds) {
      try {
        // Get payout details for response
        const payout = await this.getPayoutById(id);
        
        switch (action) {
          case 'approve':
            await this.approvePayout(id, options?.adminNotes);
            results.successfulPayouts.push({
              payoutId: id,
              agentCode: payout.agent?.agentCode || 'N/A',
              amount: Number(payout.amount),
              message: `Payout approved successfully`
            });
            break;
          case 'review':
            // Check for individual message first, then fall back to global message
            let reviewMessage = options?.reviewMessage;
            
            if (options?.individualMessages) {
              const individualMsg = options.individualMessages.find(msg => msg.payoutId === id);
              if (individualMsg) {
                reviewMessage = individualMsg.reviewMessage;
              }
            }
            
            if (!reviewMessage) {
              throw new BadRequestException(`Review message required for payout ${id}`);
            }
            
            await this.reviewPayout(id, reviewMessage, options?.adminNotes);
            results.successfulPayouts.push({
              payoutId: id,
              agentCode: payout.agent?.agentCode || 'N/A',
              amount: Number(payout.amount),
              message: `Payout set to review: ${reviewMessage}`
            });
            break;
          default:
            throw new BadRequestException(`Unknown action: ${action}. Supported actions: approve, review`);
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
        results.failedPayouts.push({
          payoutId: id,
          error: error.message
        });
      }
    }

    return results;
  }

  async getAgentStats(): Promise<any> {
    const totalAgents = await this.agentsRepository.count();
    const activeAgents = await this.agentsRepository.count({ where: { status: AgentStatus.ACTIVE } });
    const totalEarnings = await this.earningsRepository
      .createQueryBuilder('earning')
      .select('SUM(earning.amount)', 'total')
      .getRawOne();

    const totalPayouts = await this.payoutsRepository
      .createQueryBuilder('payout')
      .select('SUM(payout.amount)', 'total')
      .where('payout.status = :status', { status: PayoutStatus.APPROVED })
      .getRawOne();

    return {
      totalAgents,
      activeAgents,
      totalEarnings: totalEarnings.total || 0,
      totalPayouts: totalPayouts.total || 0,
      pendingPayouts: await this.payoutsRepository.count({ where: { status: PayoutStatus.PENDING } }),
    };
  }

  async getSystemEarningsSummary(period?: string): Promise<any> {
    const dateFilter = this.getDateFilter(period);
    
    const queryBuilder = this.earningsRepository.createQueryBuilder('earning');
    
    if (dateFilter) {
      queryBuilder.where('earning.earnedAt >= :startDate', { startDate: dateFilter });
    }

    const earnings = await queryBuilder.getMany();

    return {
      total: earnings.reduce((sum, e) => sum + Number(e.amount), 0),
      count: earnings.length,
      byType: this.groupEarningsByType(earnings),
      byStatus: this.groupEarningsByStatus(earnings),
    };
  }

  async getAgentFinancialOverview(id: string): Promise<any> {
    const agent = await this.findById(id);
    const earnings = await this.getAgentEarnings(id);
    const payouts = await this.getAgentPayouts(id);

    return {
      agent: {
        id: agent.id,
        agentCode: agent.agentCode,
        status: agent.status,
        totalEarnings: agent.totalEarnings,
        availableBalance: agent.availableBalance,
        pendingBalance: agent.pendingBalance,
      },
      earnings: {
        total: earnings.length,
        amount: earnings.reduce((sum, e) => sum + Number(e.amount), 0),
        byType: this.groupEarningsByType(earnings),
      },
      payouts: {
        total: payouts.length,
        amount: payouts.reduce((sum, p) => sum + Number(p.amount), 0),
        byStatus: this.groupPayoutsByStatus(payouts),
      },
    };
  }

  async suspendAgentEarnings(id: string, reason: string, adminNotes?: string): Promise<Agent> {
    const agent = await this.findById(id);
    
    agent.metadata = {
      ...agent.metadata,
      earningsSuspended: true,
      suspensionReason: reason,
      suspendedAt: new Date().toISOString(),
      adminNotes,
    };

    return this.agentsRepository.save(agent);
  }

  async resumeAgentEarnings(id: string, adminNotes?: string): Promise<Agent> {
    const agent = await this.findById(id);
    
    agent.metadata = {
      ...agent.metadata,
      earningsSuspended: false,
      suspensionReason: null,
      suspendedAt: null,
      resumedAt: new Date().toISOString(),
      adminNotes,
    };

    return this.agentsRepository.save(agent);
  }

  // Helper Methods
  private async updateAgentBalancesOnPayoutStatusChange(payout: Payout, previousStatus: PayoutStatus): Promise<void> {
    const agent = payout.agent;

    if (payout.status === PayoutStatus.APPROVED && previousStatus !== PayoutStatus.APPROVED) {
      // Payout approved - remove from pending balance (funds are now being processed externally)
      agent.pendingBalance -= payout.amount;
    }
    // Note: REVIEW status doesn't change balances - funds remain in pending until approved

    await this.agentsRepository.save(agent);
  }

  private mapAdjustmentTypeToEarningType(adjustmentType: AdjustmentType): EarningType {
    switch (adjustmentType) {
      case AdjustmentType.BONUS:
        return EarningType.BONUS;
      case AdjustmentType.PENALTY:
        return EarningType.PENALTY;
      default:
        return EarningType.ADJUSTMENT;
    }
  }

  private groupEarningsByType(earnings: AgentEarnings[]): Record<string, number> {
    return earnings.reduce((acc, earning) => {
      acc[earning.type] = (acc[earning.type] || 0) + Number(earning.amount);
      return acc;
    }, {});
  }

  private groupEarningsByStatus(earnings: AgentEarnings[]): Record<string, number> {
    return earnings.reduce((acc, earning) => {
      acc[earning.status] = (acc[earning.status] || 0) + 1;
      return acc;
    }, {});
  }

  private groupPayoutsByStatus(payouts: Payout[]): Record<string, number> {
    return payouts.reduce((acc, payout) => {
      acc[payout.status] = (acc[payout.status] || 0) + 1;
      return acc;
    }, {});
  }

  private groupPayoutsByMethod(payouts: Payout[]): Record<string, number> {
    return payouts.reduce((acc, payout) => {
      acc[payout.method] = (acc[payout.method] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateAverageProcessingTime(payouts: Payout[]): number {
    const completedPayouts = payouts.filter(p => p.processingTime !== null);
    if (completedPayouts.length === 0) return 0;
    
    const totalTime = completedPayouts.reduce((sum, p) => sum + p.processingTime, 0);
    return totalTime / completedPayouts.length;
  }

  private getDateFilter(period?: string): Date | null {
    if (!period) return null;
    
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }

  // Agent deactivation methods
  async deactivateAgent(agentId: string, reason?: string): Promise<any> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId },
      relations: ['user'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.status === AgentStatus.INACTIVE) {
      throw new BadRequestException('Agent is already inactive');
    }

    // Update agent status
    agent.status = AgentStatus.INACTIVE;
    agent.lastActivityAt = new Date();
    
    // Add notes about deactivation
    agent.notes = agent.notes 
      ? `${agent.notes}\n\nDeactivated on ${new Date().toISOString()}: ${reason || 'Manual deactivation'}`
      : `Deactivated on ${new Date().toISOString()}: ${reason || 'Manual deactivation'}`;

    await this.agentsRepository.save(agent);

    // TODO: Add audit log entry here when audit logging is implemented
    
    return {
      success: true,
      message: 'Agent deactivated successfully',
      agent: {
        id: agent.id,
        agentCode: agent.agentCode,
        status: agent.status,
        deactivatedAt: new Date(),
        reason: reason || 'Manual deactivation',
      },
    };
  }

  async checkAndDeactivateInactiveAgents(): Promise<any> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Find agents that haven't been active for 6 months
    const inactiveAgents = await this.agentsRepository
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.user', 'user')
      .where('agent.status = :status', { status: AgentStatus.ACTIVE })
      .andWhere('(agent.lastActivityAt IS NULL OR agent.lastActivityAt < :sixMonthsAgo)', { sixMonthsAgo })
      .getMany();

    const deactivationResults = [];
    
    for (const agent of inactiveAgents) {
      try {
        const result = await this.deactivateAgent(
          agent.id, 
          'Automatic deactivation due to 6 months of inactivity'
        );
        deactivationResults.push(result);
      } catch (error) {
        console.error(`Failed to deactivate agent ${agent.agentCode}:`, error);
      }
    }

    return {
      success: true,
      message: `Checked ${inactiveAgents.length} inactive agents`,
      deactivated: deactivationResults.length,
      results: deactivationResults,
    };
  }

  async reactivateAgent(agentId: string, reason?: string): Promise<any> {
    const agent = await this.agentsRepository.findOne({
      where: { id: agentId },
      relations: ['user'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.status === AgentStatus.ACTIVE) {
      throw new BadRequestException('Agent is already active');
    }

    // Update agent status
    agent.status = AgentStatus.ACTIVE;
    agent.lastActivityAt = new Date();
    
    // Add notes about reactivation
    agent.notes = agent.notes 
      ? `${agent.notes}\n\nReactivated on ${new Date().toISOString()}: ${reason || 'Manual reactivation'}`
      : `Reactivated on ${new Date().toISOString()}: ${reason || 'Manual reactivation'}`;

    await this.agentsRepository.save(agent);

    return {
      success: true,
      message: 'Agent reactivated successfully',
      agent: {
        id: agent.id,
        agentCode: agent.agentCode,
        status: agent.status,
        reactivatedAt: new Date(),
        reason: reason || 'Manual reactivation',
      },
    };
  }

  // Payout status transition validation
  private validatePayoutStatusTransition(currentStatus: PayoutStatus, newStatus: PayoutStatus): void {
    const validTransitions: Record<PayoutStatus, PayoutStatus[]> = {
      [PayoutStatus.PENDING]: [PayoutStatus.APPROVED, PayoutStatus.REVIEW],
      [PayoutStatus.REVIEW]: [PayoutStatus.APPROVED, PayoutStatus.PENDING],
      [PayoutStatus.APPROVED]: [], // Final state - payout is processed externally
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid payout status transition from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions: ${allowedTransitions.join(', ') || 'none (final state)'}`
      );
    }
  }

  // Enhanced earnings validation to prevent negative balances
  private validateEarningsAdjustment(agent: any, adjustmentAmount: number): void {
    if (adjustmentAmount < 0) {
      const deductionAmount = Math.abs(adjustmentAmount);
      if (deductionAmount > agent.availableBalance) {
        throw new BadRequestException(
          `Cannot deduct $${deductionAmount.toFixed(2)} - exceeds available balance of $${agent.availableBalance.toFixed(2)}`
        );
      }
    }
  }

  // Payout method validation
  private validatePayoutMethod(method: PayoutMethod, paymentDetails: any): void {
    switch (method) {
      case PayoutMethod.BANK_TRANSFER:
        if (!paymentDetails.bankAccount) {
          throw new BadRequestException('Bank account details required for bank transfer');
        }
        const { accountNumber, routingNumber, accountName: bankAccountName, bankName } = paymentDetails.bankAccount;
        if (!accountNumber || !routingNumber || !bankAccountName || !bankName) {
          throw new BadRequestException('Complete bank account details required: accountNumber, routingNumber, accountName, bankName');
        }
        break;

      case PayoutMethod.PLANETTALK_CREDIT:
        if (!paymentDetails.planettalkCredit) {
          throw new BadRequestException('PlanetTalk credit details required');
        }
        const { planettalkMobile } = paymentDetails.planettalkCredit;
        if (!planettalkMobile) {
          throw new BadRequestException('PlanetTalk associated mobile number required');
        }
        // Validate phone number format
        if (!this.isValidPhoneNumber(planettalkMobile)) {
          throw new BadRequestException('Invalid mobile number format. Please include country code (e.g., +263771234567)');
        }
        break;

      default:
        throw new BadRequestException(`Unsupported payout method: ${method}`);
    }
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation - should start with + and contain 10-15 digits
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  // Notification helper methods
  private async sendPayoutStatusNotification(payout: Payout, previousStatus: PayoutStatus): Promise<void> {
    try {
      const agent = await this.agentsRepository.findOne({
        where: { id: payout.agentId },
        relations: ['user'],
      });

      if (!agent || !agent.user) return;

      const statusMessages = {
        [PayoutStatus.APPROVED]: {
          title: 'Payout Approved',
          message: `Your payout request of $${payout.amount.toFixed(2)} has been approved and will be processed soon.`,
          priority: NotificationPriority.HIGH,
        },
        [PayoutStatus.REVIEW]: {
          title: 'Payout Under Review',
          message: `Your payout request of $${payout.amount.toFixed(2)} requires additional review.${payout.reviewMessage ? ` Message: ${payout.reviewMessage}` : ''}`,
          priority: NotificationPriority.MEDIUM,
        },
      };

      const statusInfo = statusMessages[payout.status];
      if (statusInfo && previousStatus !== payout.status) {
        await this.notificationsService.createNotification({
          userId: agent.user.id,
          type: NotificationType.PAYOUT,
          priority: statusInfo.priority,
          title: statusInfo.title,
          message: statusInfo.message,
          actionUrl: `/dashboard/payouts/${payout.id}`,
          actionText: 'View Payout Details',
          metadata: {
            payoutId: payout.id,
            amount: payout.amount,
            status: payout.status,
            previousStatus,
          },
        });

        // Send email notification for all status changes
        try {
          if (payout.status === PayoutStatus.APPROVED) {
            await this.sendPayoutApprovedEmail(agent, payout);
          } else if (payout.status === PayoutStatus.REVIEW) {
            // Send generic payout notification email for review
            await this.sendPayoutStatusEmail(agent, payout);
          }
        } catch (error) {
          console.error(`Failed to send payout ${payout.status} email:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to send payout notification:', error);
    }
  }

  private async sendEarningsNotification(agent: Agent, earning: AgentEarnings): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({ where: { id: agent.userId } });
      if (!user) return;

      const isPositive = earning.amount >= 0;
      const title = isPositive ? 'New Earnings Added' : 'Earnings Adjustment';
      const message = isPositive 
        ? `You've earned $${earning.amount.toFixed(2)}! ${earning.description || ''}`
        : `An adjustment of $${earning.amount.toFixed(2)} has been made to your account. ${earning.description || ''}`;

      await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.EARNINGS,
        priority: isPositive ? NotificationPriority.MEDIUM : NotificationPriority.HIGH,
        title,
        message,
        actionUrl: '/dashboard/earnings',
        actionText: 'View Earnings',
        metadata: {
          earningId: earning.id,
          amount: earning.amount,
          type: earning.type,
        },
      });
    } catch (error) {
      console.error('Failed to send earnings notification:', error);
    }
  }

  private async sendApplicationStatusNotification(application: AgentApplication, status: ApplicationStatus): Promise<void> {
    try {
      // For applications, we might not have a user yet, so we'll send email directly
      const statusMessages = {
        [ApplicationStatus.APPROVED]: {
          title: 'Application Approved',
          message: 'Congratulations! Your agent application has been approved. You will receive your login credentials soon.',
          priority: NotificationPriority.HIGH,
        },
        [ApplicationStatus.REJECTED]: {
          title: 'Application Status Update',
          message: `Your application has been reviewed. ${application.rejectionReason || 'Please contact support for more information.'}`,
          priority: NotificationPriority.HIGH,
        },
      };

      const statusInfo = statusMessages[status];
      if (statusInfo) {
        // Send email notification for application updates
        await this.emailService.sendTemplateEmail(
          application.email,
          statusInfo.title,
          'notification-application',
          {
            firstName: application.firstName,
            title: statusInfo.title,
            message: statusInfo.message,
            applicationId: application.id,
            dashboardUrl: process.env.FRONTEND_URL,
          }
        );
      }
    } catch (error) {
      console.error('Failed to send application notification:', error);
    }
  }

  // Automatic earnings creation for agent code referrals
  private async createAgentCodeEarnings(
    agent: Agent, 
    referralUsage: ReferralUsage, 
    useReferralCodeDto: UseReferralCodeDto
  ): Promise<void> {
    try {
      // Get base commission amount - default for airtime top-up
      const signupAmount = 25.00; // Default $25 for airtime top-up
      
      // Calculate commission based on agent's rate (no bonus rate for agent codes)
      const agentCommissionRate = parseFloat(agent.commissionRate.toString());
      const commissionAmount = signupAmount * (agentCommissionRate / 100);
      
      // Service type is always airtime top-up
      const serviceType = 'PlanetTalk Airtime Service';
      const customerName = useReferralCodeDto.fullName;
      const customerPhone = useReferralCodeDto.phoneNumber;
      
      // Create earnings record
      const earning = this.earningsRepository.create({
        agentId: agent.id,
        type: EarningType.REFERRAL_COMMISSION,
        status: EarningStatus.PENDING, // Starts as pending for verification
        amount: Math.round(commissionAmount * 100) / 100,
        currency: 'USD',
        commissionRate: agentCommissionRate,
        description: `PlanetTalk referral commission - ${customerName} (${customerPhone})`,
        referenceId: `AGT-${agent.agentCode}-${new Date().getFullYear()}-${String(agent.totalReferrals + 1).padStart(3, '0')}`,
        earnedAt: new Date(),
        confirmedAt: null, // Will be confirmed manually
        referralUsageId: referralUsage.id,
        metadata: {
          agentCode: agent.agentCode,
          referralMethod: 'agent_code',
          signupAmount: signupAmount,
          agentRate: agentCommissionRate,
          commissionPeriod: '24 months',
          customerInfo: {
            name: useReferralCodeDto.fullName,
            phone: useReferralCodeDto.phoneNumber,
          },
          serviceDetails: {
            serviceType: serviceType,
            signupAmount: signupAmount,
          },
          autoCreated: true,
          createdBy: 'agent-code-system',
        },
      });

      const savedEarning = await this.earningsRepository.save(earning);

      // Update agent pending balance
      agent.pendingBalance = (parseFloat(agent.pendingBalance.toString()) || 0) + commissionAmount;
      await this.agentsRepository.save(agent);

      // Send earnings notification
      await this.sendEarningsNotification(agent, savedEarning);

      console.log(`💰 Auto-created agent code earnings: $${commissionAmount.toFixed(2)} for agent ${agent.agentCode} (customer: ${customerName})`);
    } catch (error) {
      console.error('Failed to create automatic agent code earnings:', error);
      // Don't throw error - referral usage should still be saved
    }
  }

  // Generate personalized referral messages for PlanetTalk airtime business
  private generatePersonalizedMessage(referralCode: ReferralCode, agentFullName: string): string {
    const baseMessage = `Hi, my name is ${agentFullName}.`;
    
    switch (referralCode.type) {
      case ReferralCodeType.PROMOTIONAL:
        return `${baseMessage} I'm excited to share my special ${referralCode.description || 'promotional offer'} referral code with you! Use my code when you sign up with PlanetTalk and I'll earn commission every time you top up for the next 24 months. Help the diaspora connect and support their families back home without breaking the bank!`;
      
      case ReferralCodeType.VIP:
        return `${baseMessage} As a VIP PlanetTalk agent, I'm offering you exclusive access to our premium airtime services! Use my referral code and enjoy better rates while I earn commission on your top-ups for 24 months. Together, we can help families stay connected worldwide!`;
      
      case ReferralCodeType.LIMITED_TIME:
        const expiryText = referralCode.expiresAt ? 
          ` This exclusive offer expires ${new Date(referralCode.expiresAt).toLocaleDateString()}, so don't miss out!` : '';
        return `${baseMessage} I have a limited-time referral code for PlanetTalk's amazing airtime services.${expiryText} Sign up with my code and I'll earn commission every time you top up for 24 months. Let's help your family stay connected!`;
      
      case ReferralCodeType.STANDARD:
      default:
        const bonusText = referralCode.bonusCommissionRate > 0 ? 
          ` Plus, you'll get additional benefits with my special bonus rate!` : '';
        return `${baseMessage} Here is my referral code for PlanetTalk airtime services.${bonusText} Use my code when you sign up and I'll earn commission every time you top up for the next 24 months. Help the diaspora connect and support their families back home without breaking the bank!`;
    }
  }

  // Generate personalized message for agent code referrals
  private generateAgentCodeMessage(agentFullName: string): string {
    return `Hi, my name is ${agentFullName}. Here is my PlanetTalk referral code! Use my agent code when you sign up and I'll earn commission every time you top up for the next 24 months. Help the diaspora connect and support their families back home without breaking the bank!`;
  }

  /**
   * Get all earnings with filtering options (Admin)
   */
  async getAllEarnings(filters?: {
    status?: string;
    agentId?: string;
    tier?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const { status, agentId, tier, startDate, endDate } = filters || {};
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 20;

    const queryBuilder = this.earningsRepository.createQueryBuilder('earning')
      .leftJoinAndSelect('earning.agent', 'agent')
      .leftJoinAndSelect('agent.user', 'user')
      .leftJoinAndSelect('earning.referralUsage', 'referralUsage');

    // Apply status filter
    if (status) {
      queryBuilder.andWhere('earning.status = :status', { status });
    }

    // Apply agent filter
    if (agentId) {
      queryBuilder.andWhere('earning.agentId = :agentId', { agentId });
    }

    // Apply tier filter
    if (tier) {
      queryBuilder.andWhere('agent.tier = :tier', { tier });
    }

    // Apply date range filters
    if (startDate) {
      queryBuilder.andWhere('earning.earnedAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('earning.earnedAt <= :endDate', { endDate });
    }

    // Get total count for pagination
    const total = await queryBuilder.getCount();

    // Apply ordering and pagination
    const earnings = await queryBuilder
      .orderBy('earning.earnedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Calculate global earnings metrics (unfiltered)
    const globalMetrics = await this.calculateEarningsMetrics();

    return {
      earnings: earnings.map(earning => ({
        id: earning.id,
        amount: earning.amount,
        currency: earning.currency,
        description: earning.description,
        status: earning.status,
        earnedAt: earning.earnedAt,
        confirmedAt: earning.confirmedAt,
        commissionRate: earning.commissionRate,
        referenceId: earning.referenceId,
        agent: {
          id: earning.agent.id,
          agentCode: earning.agent.agentCode,
          firstName: earning.agent.user.firstName,
          lastName: earning.agent.user.lastName,
          fullName: `${earning.agent.user.firstName} ${earning.agent.user.lastName}`,
          tier: earning.agent.tier,
          email: earning.agent.user.email,
        },
        referralUsage: earning.referralUsage ? {
          id: earning.referralUsage.id,
          referredUserName: earning.referralUsage.referredUserName,
          referredUserPhone: earning.referralUsage.referredUserPhone,
          usedAt: earning.referralUsage.usedAt,
        } : null,
        metadata: earning.metadata,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      metrics: globalMetrics,
      filters: {
        applied: {
          status,
          agentId,
          tier,
          startDate,
          endDate,
        },
        resultsForFilters: total,
      },
    };
  }

  /**
   * Get pending earnings for admin approval (Legacy - uses getAllEarnings)
   */
  async getPendingEarnings(page: number = 1, limit: number = 20, agentId?: string): Promise<any> {
    return this.getAllEarnings({
      status: EarningStatus.PENDING,
      agentId,
      page,
      limit,
    });
  }

  /**
   * Approve individual earning
   */
  async approveEarning(earningId: string, notes?: string): Promise<any> {
    const earning = await this.earningsRepository.findOne({
      where: { id: earningId },
      relations: ['agent', 'agent.user'],
    });

    if (!earning) {
      throw new NotFoundException('Earning not found');
    }

    if (earning.status !== EarningStatus.PENDING) {
      throw new BadRequestException('Earning is not in pending status');
    }

    earning.status = EarningStatus.CONFIRMED;
    earning.confirmedAt = new Date();
    earning.metadata = {
      ...earning.metadata,
      approvedBy: 'admin',
      approvedAt: new Date().toISOString(),
      approvalNotes: notes,
    };

    await this.earningsRepository.save(earning);

    // Update agent balance and total earnings
    earning.agent.availableBalance = parseFloat(earning.agent.availableBalance.toString()) + parseFloat(earning.amount.toString());
    earning.agent.totalEarnings = parseFloat(earning.agent.totalEarnings.toString()) + parseFloat(earning.amount.toString());
    await this.agentsRepository.save(earning.agent);

    return {
      success: true,
      id: earning.id,
      amount: earning.amount,
      status: earning.status,
      message: `Earning of $${earning.amount} approved for agent ${earning.agent.user.firstName} ${earning.agent.user.lastName}`,
    };
  }

  /**
   * Reject individual earning
   */
  async rejectEarning(earningId: string, reason: string, notes?: string): Promise<any> {
    const earning = await this.earningsRepository.findOne({
      where: { id: earningId },
      relations: ['agent', 'agent.user'],
    });

    if (!earning) {
      throw new NotFoundException('Earning not found');
    }

    if (earning.status !== EarningStatus.PENDING) {
      throw new BadRequestException('Earning is not in pending status');
    }

    earning.status = EarningStatus.CANCELLED;
    earning.metadata = {
      ...earning.metadata,
      rejectedBy: 'admin',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
      rejectionNotes: notes,
    };

    await this.earningsRepository.save(earning);

    return {
      success: true,
      id: earning.id,
      amount: earning.amount,
      status: earning.status,
      reason: reason,
      message: `Earning of $${earning.amount} rejected for agent ${earning.agent.user.firstName} ${earning.agent.user.lastName}`,
    };
  }

  /**
   * Bulk approve multiple earnings
   */
  async bulkApproveEarnings(earningIds: string[], notes?: string): Promise<any> {
    const results = { approved: 0, failed: 0, errors: [] };

    for (const earningId of earningIds) {
      try {
        await this.approveEarning(earningId, notes);
        results.approved++;
      } catch (error) {
        results.failed++;
        results.errors.push({ earningId, error: error.message });
      }
    }

    return {
      success: true,
      summary: `${results.approved} earnings approved, ${results.failed} failed`,
      ...results,
    };
  }

  /**
   * Bulk reject multiple earnings
   */
  async bulkRejectEarnings(earningIds: string[], reason: string, notes?: string): Promise<any> {
    const results = { rejected: 0, failed: 0, errors: [] };

    for (const earningId of earningIds) {
      try {
        await this.rejectEarning(earningId, reason, notes);
        results.rejected++;
      } catch (error) {
        results.failed++;
        results.errors.push({ earningId, error: error.message });
      }
    }

    return {
      success: true,
      summary: `${results.rejected} earnings rejected, ${results.failed} failed`,
      ...results,
    };
  }

  /**
   * Send email notification when payout request is submitted
   */
  private async sendPayoutRequestEmail(agent: Agent, payout: Payout): Promise<void> {
    const emailData = {
      firstName: agent.user.firstName,
      lastName: agent.user.lastName,
      fullName: `${agent.user.firstName} ${agent.user.lastName}`,
      agentCode: agent.agentCode,
      payoutId: payout.id,
      amount: payout.amount.toFixed(2),
      paymentMethod: this.formatPaymentMethod(payout.method),
      requestDate: payout.requestedAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      description: payout.description || 'Agent commission payout',
      agentPortalUrl: process.env.NODE_ENV === 'production' 
        ? 'https://portal.planettalk.com/en'
        : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/en` : 'http://localhost:3001/en'),
      supportEmail: 'support@planettalk.com',
      supportPhone: '+1-800-PLANET-TALK',
    };

    await this.emailService.sendEmail({
      to: agent.user.email,
      subject: 'Payout Request Under Review - PlanetTalk',
      template: 'payout-request',
      templateData: emailData,
    });

    console.log(`Payout request email sent to ${agent.user.email} for payout ${payout.id}`);
  }

  /**
   * Send email notification when payout is approved
   */
  private async sendPayoutApprovedEmail(agent: Agent, payout: Payout): Promise<void> {
    const processingTime = this.getProcessingTimeForMethod(payout.method);
    const estimatedArrival = this.calculateEstimatedArrival(payout.method);

    const emailData = {
      firstName: agent.user.firstName,
      lastName: agent.user.lastName,
      fullName: `${agent.user.firstName} ${agent.user.lastName}`,
      agentCode: agent.agentCode,
      payoutId: payout.id,
      amount: payout.amount.toFixed(2),
      netAmount: payout.netAmount ? payout.netAmount.toFixed(2) : payout.amount.toFixed(2),
      paymentMethod: this.formatPaymentMethod(payout.method),
      requestDate: payout.requestedAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      approvalDate: (payout.approvedAt || new Date()).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      processingTime,
      estimatedArrival,
      transactionId: payout.transactionId,
      adminNotes: payout.adminNotes,
      paymentDetails: payout.paymentDetails,
      agentPortalUrl: process.env.NODE_ENV === 'production' 
        ? 'https://portal.planettalk.com/en'
        : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/en` : 'http://localhost:3001/en'),
      supportEmail: 'support@planettalk.com',
      supportPhone: '+1-800-PLANET-TALK',
    };

    await this.emailService.sendEmail({
      to: agent.user.email,
      subject: '🎉 Payout Approved - PlanetTalk',
      template: 'payout-approved',
      templateData: emailData,
    });

    console.log(`Payout approval email sent to ${agent.user.email} for payout ${payout.id}`);
  }

  /**
   * Send email notification for payout status changes (reject/review)
   */
  private async sendPayoutStatusEmail(agent: Agent, payout: Payout): Promise<void> {
    const statusText = payout.status.charAt(0).toUpperCase() + payout.status.slice(1);
    
    const emailData = {
      agentName: `${agent.user.firstName} ${agent.user.lastName}`,
      payoutId: payout.id,
      amount: payout.amount.toFixed(2),
      status: statusText,
      requestedDate: payout.requestedAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      reviewMessage: payout.reviewMessage,
      adminNotes: payout.adminNotes,
      paymentDetails: payout.paymentDetails,
      dashboardUrl: process.env.NODE_ENV === 'production' 
        ? 'https://portal.planettalk.com/en/dashboard'
        : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/en/dashboard` : 'http://localhost:3001/en/dashboard'),
    };

    const subjectMap = {
      [PayoutStatus.REVIEW]: '🔍 Payout Under Review - PlanetTalk',
    };

    await this.emailService.sendEmail({
      to: agent.user.email,
      subject: subjectMap[payout.status] || `Payout Status Update - PlanetTalk`,
      template: 'payout-notification',
      templateData: emailData,
    });

    console.log(`Payout ${payout.status} email sent to ${agent.user.email} for payout ${payout.id}`);
  }

  /**
   * Format payment method for display
   */
  private formatPaymentMethod(method: PayoutMethod): string {
    const methodMap = {
      [PayoutMethod.BANK_TRANSFER]: 'Bank Transfer',
      [PayoutMethod.PLANETTALK_CREDIT]: 'PlanetTalk Credit',
    };
    return methodMap[method] || 'Unknown';
  }

  /**
   * Get processing time estimate for payment method
   */
  private getProcessingTimeForMethod(method: PayoutMethod): string {
    const timeMap = {
      [PayoutMethod.BANK_TRANSFER]: '2-3 business days',
      [PayoutMethod.PLANETTALK_CREDIT]: '1-4 hours',
    };
    return timeMap[method] || '2-3 business days';
  }

  /**
   * Calculate monthly statistics for an agent
   */
  private async calculateAgentMonthlyStats(agentId: string): Promise<{ earningsThisMonth: number; referralsThisMonth: number }> {
    // Get current month start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Calculate earnings this month
    const earningsResult = await this.earningsRepository
      .createQueryBuilder('earning')
      .select('SUM(earning.amount)', 'total')
      .where('earning.agentId = :agentId', { agentId })
      .andWhere('earning.earnedAt >= :startOfMonth', { startOfMonth })
      .andWhere('earning.earnedAt <= :endOfMonth', { endOfMonth })
      .andWhere('earning.status = :status', { status: 'confirmed' })
      .getRawOne();

    // Calculate referrals this month
    const referralsResult = await this.referralUsageRepository
      .createQueryBuilder('usage')
      .leftJoin('usage.referralCode', 'code')
      .where('code.agentId = :agentId', { agentId })
      .andWhere('usage.usedAt >= :startOfMonth', { startOfMonth })
      .andWhere('usage.usedAt <= :endOfMonth', { endOfMonth })
      .andWhere('usage.status = :status', { status: 'confirmed' })
      .getCount();

    return {
      earningsThisMonth: Number(earningsResult?.total || 0),
      referralsThisMonth: referralsResult || 0,
    };
  }

  /**
   * Calculate estimated arrival date for payment
   */
  private calculateEstimatedArrival(method: PayoutMethod): string {
    const now = new Date();
    let businessDaysToAdd = 3; // default

    switch (method) {
      case PayoutMethod.BANK_TRANSFER:
        businessDaysToAdd = 3;
        break;
      case PayoutMethod.PLANETTALK_CREDIT:
        return 'Within 4 hours';
    }

    // Add business days (skip weekends)
    let count = 0;
    const result = new Date(now);
    while (count < businessDaysToAdd) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
    }

    return result.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Bulk upload earnings for multiple agents by agent codes
   */
  async bulkUploadEarnings(bulkUploadDto: BulkEarningsUploadDto): Promise<BulkEarningsUploadResultDto> {
    const startTime = Date.now();
    const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const result: BulkEarningsUploadResultDto = {
      totalProcessed: bulkUploadDto.earnings.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      totalAmount: 0,
      updatedAgents: [],
      details: [],
      errorSummary: {
        invalidAgentCodes: [],
        duplicateReferences: [],
        validationErrors: [],
        otherErrors: [],
      },
      batchInfo: {
        batchId,
        processedAt: new Date(),
        processingTimeMs: 0,
        uploadedBy: 'admin', // In a real app, get from JWT token
      },
    };

    // Track which agents need balance updates
    const agentBalanceUpdates = new Map<string, { agent: Agent; totalEarnings: number; count: number }>();
    const processedReferenceIds = new Set<string>();
    
    try {
      // First pass: validate all agent codes and collect agents
      const agentCodeMap = new Map<string, Agent>();
      const uniqueAgentCodes = [...new Set(bulkUploadDto.earnings.map(e => e.agentCode))];
      
      for (const agentCode of uniqueAgentCodes) {
        try {
          const agent = await this.agentsRepository.findOne({
            where: { agentCode },
            relations: ['user'],
          });
          
          if (agent) {
            agentCodeMap.set(agentCode, agent);
          } else {
            result.errorSummary.invalidAgentCodes.push(agentCode);
          }
        } catch (error) {
          result.errorSummary.invalidAgentCodes.push(agentCode);
        }
      }

      // Second pass: process each earning entry
      for (let i = 0; i < bulkUploadDto.earnings.length; i++) {
        const earningEntry = bulkUploadDto.earnings[i];
        const detailResult: {
          agentCode: string;
          status: 'success' | 'failed' | 'skipped';
          earningId?: string;
          amount?: number;
          error?: string;
          message?: string;
        } = {
          agentCode: earningEntry.agentCode,
          status: 'failed',
          amount: earningEntry.amount,
        };

        try {
          // Check if agent exists
          const agent = agentCodeMap.get(earningEntry.agentCode);
          if (!agent) {
            detailResult.error = 'Agent code not found';
            result.details.push(detailResult);
            result.failed++;
            continue;
          }

          // Check for duplicate reference ID
          if (earningEntry.referenceId && processedReferenceIds.has(earningEntry.referenceId)) {
            detailResult.status = 'skipped';
            detailResult.error = 'Duplicate reference ID in this batch';
            result.details.push(detailResult);
            result.skipped++;
            result.errorSummary.duplicateReferences.push(earningEntry.referenceId);
            continue;
          }

          // Check for existing reference ID in database
          if (earningEntry.referenceId) {
            const existingEarning = await this.earningsRepository.findOne({
              where: { referenceId: earningEntry.referenceId },
            });
            
            if (existingEarning) {
              detailResult.status = 'skipped';
              detailResult.error = 'Reference ID already exists in database';
              result.details.push(detailResult);
              result.skipped++;
              result.errorSummary.duplicateReferences.push(earningEntry.referenceId);
              continue;
            }
            
            processedReferenceIds.add(earningEntry.referenceId);
          }

          // Create earning record
          const earning = this.earningsRepository.create({
            agentId: agent.id,
            type: earningEntry.type,
            amount: earningEntry.amount,
            currency: earningEntry.currency || 'USD',
            commissionRate: earningEntry.commissionRate,
            description: earningEntry.description,
            referenceId: earningEntry.referenceId,
            earnedAt: earningEntry.earnedAt ? new Date(earningEntry.earnedAt) : new Date(),
            status: bulkUploadDto.autoConfirm ? EarningStatus.CONFIRMED : EarningStatus.PENDING,
            metadata: {
              batchId,
              batchDescription: bulkUploadDto.batchDescription,
              uploadedBy: 'admin', // In a real app, get from JWT token
              uploadedAt: new Date(),
              ...bulkUploadDto.metadata,
            },
          });

          const savedEarning = await this.earningsRepository.save(earning);
          
          // Track agent for balance update (only if confirmed)
          if (bulkUploadDto.autoConfirm) {
            if (agentBalanceUpdates.has(agent.id)) {
              const update = agentBalanceUpdates.get(agent.id)!;
              update.totalEarnings += earningEntry.amount;
              update.count++;
            } else {
              agentBalanceUpdates.set(agent.id, {
                agent,
                totalEarnings: earningEntry.amount,
                count: 1,
              });
            }
          }

          detailResult.status = 'success';
          detailResult.earningId = savedEarning.id;
          detailResult.message = bulkUploadDto.autoConfirm ? 'Earning created and confirmed' : 'Earning created (pending approval)';
          result.details.push(detailResult);
          result.successful++;
          result.totalAmount += earningEntry.amount;

        } catch (error) {
          detailResult.error = error.message || 'Unknown error occurred';
          result.details.push(detailResult);
          result.failed++;
          result.errorSummary.otherErrors.push(`${earningEntry.agentCode}: ${detailResult.error}`);
        }
      }

      // Third pass: update agent balances if auto-confirm is enabled
      if (bulkUploadDto.autoConfirm && agentBalanceUpdates.size > 0) {
        for (const [agentId, update] of agentBalanceUpdates) {
          try {
            const agent = update.agent;
            agent.totalEarnings += update.totalEarnings;
            agent.availableBalance += update.totalEarnings;
            
            await this.agentsRepository.save(agent);
            result.updatedAgents.push(agent.agentCode);

            // Send notification to agent about new earnings
            if (agent.user) {
              await this.notificationsService.createNotification({
                userId: agent.user.id,
                type: NotificationType.EARNINGS,
                title: 'New Earnings Added',
                message: `${update.count} new earning${update.count > 1 ? 's' : ''} totaling $${update.totalEarnings.toFixed(2)} ${update.count > 1 ? 'have' : 'has'} been added to your account.`,
                priority: NotificationPriority.MEDIUM,
                actionUrl: `/earnings`,
                actionText: 'View Earnings',
              });
            }
          } catch (error) {
            // Log the error but don't fail the entire operation
            console.error(`Failed to update balance for agent ${update.agent.agentCode}:`, error);
          }
        }
      }

    } catch (error) {
      // Handle any unexpected errors
      console.error('Bulk earnings upload error:', error);
      result.errorSummary.otherErrors.push(`Batch processing error: ${error.message}`);
    }

    // Calculate processing time
    result.batchInfo.processingTimeMs = Date.now() - startTime;

    return result;
  }

  /**
   * Update agent earnings externally (individual)
   */
  async updateAgentEarnings(updateDto: UpdateAgentEarningsDto): Promise<{ success: boolean; newBalance: number; message: string }> {
    const agent = await this.findById(updateDto.agentId);
    
    // Create an earning record for tracking
    const earning = this.earningsRepository.create({
      agentId: updateDto.agentId,
      type: updateDto.amount >= 0 ? EarningType.BONUS : EarningType.ADJUSTMENT,
      amount: updateDto.amount,
      description: updateDto.description || `External earnings update: ${updateDto.amount >= 0 ? 'addition' : 'deduction'}`,
      earnedAt: new Date(),
      status: EarningStatus.CONFIRMED, // External updates are automatically confirmed
      metadata: {
        ...updateDto.metadata,
        source: 'external_update',
        updatedAt: new Date().toISOString(),
      },
    });

    await this.earningsRepository.save(earning);

    // Update agent balances
    agent.totalEarnings += updateDto.amount;
    agent.availableBalance += updateDto.amount;
    
    // Ensure balances don't go negative
    if (agent.availableBalance < 0) {
      agent.availableBalance = 0;
    }
    if (agent.totalEarnings < 0) {
      agent.totalEarnings = 0;
    }

    await this.agentsRepository.save(agent);

    return {
      success: true,
      newBalance: agent.availableBalance,
      message: `Agent earnings updated by $${updateDto.amount.toFixed(2)}`,
    };
  }

  /**
   * Update agent referrals externally (individual)
   */
  async updateAgentReferrals(updateDto: UpdateAgentReferralsDto): Promise<{ success: boolean; newTotal: number; message: string }> {
    const agent = await this.findById(updateDto.agentId);
    
    // Update referral counts
    agent.totalReferrals += updateDto.referralCount;
    agent.activeReferrals += updateDto.referralCount;
    
    // Ensure counts don't go negative
    if (agent.totalReferrals < 0) {
      agent.totalReferrals = 0;
    }
    if (agent.activeReferrals < 0) {
      agent.activeReferrals = 0;
    }

    // Add metadata about the update
    agent.metadata = {
      ...agent.metadata,
      lastReferralUpdate: {
        count: updateDto.referralCount,
        description: updateDto.description,
        updatedAt: new Date().toISOString(),
        source: 'external_update',
        ...updateDto.metadata,
      },
    };

    await this.agentsRepository.save(agent);

    return {
      success: true,
      newTotal: agent.totalReferrals,
      message: `Agent referrals updated by ${updateDto.referralCount}`,
    };
  }

  /**
   * Bulk update agent earnings
   */
  async bulkUpdateEarnings(bulkDto: BulkUpdateEarningsDto): Promise<{ success: number; failed: number; errors: any[]; totalAmount: number }> {
    const results = { success: 0, failed: 0, errors: [], totalAmount: 0 };

    for (const update of bulkDto.updates) {
      try {
        const result = await this.updateAgentEarnings(update);
        if (result.success) {
          results.success++;
          results.totalAmount += update.amount;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          agentId: update.agentId, 
          amount: update.amount,
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Bulk update agent referrals
   */
  async bulkUpdateReferrals(bulkDto: BulkUpdateReferralsDto): Promise<{ success: number; failed: number; errors: any[]; totalReferrals: number }> {
    const results = { success: 0, failed: 0, errors: [], totalReferrals: 0 };

    for (const update of bulkDto.updates) {
      try {
        const result = await this.updateAgentReferrals(update);
        if (result.success) {
          results.success++;
          results.totalReferrals += update.referralCount;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          agentId: update.agentId, 
          referralCount: update.referralCount,
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Update agent stats (earnings and/or referrals) in a single request
   */
  async updateAgentStats(updateDto: UpdateAgentStatsDto): Promise<{ 
    success: boolean; 
    earningsUpdated: boolean;
    referralsUpdated: boolean;
    newBalance?: number; 
    newReferralTotal?: number;
    message: string;
  }> {
    const agent = await this.findById(updateDto.agentId);
    let earningsUpdated = false;
    let referralsUpdated = false;
    let newBalance = agent.availableBalance;
    let newReferralTotal = agent.totalReferrals;

    // Update earnings if amount is provided
    if (updateDto.amount !== undefined && updateDto.amount !== null) {
      // Create an earning record for tracking
      const earning = this.earningsRepository.create({
        agentId: updateDto.agentId,
        type: updateDto.amount >= 0 ? EarningType.BONUS : EarningType.ADJUSTMENT,
        amount: updateDto.amount,
        description: updateDto.description || `External stats update: earnings ${updateDto.amount >= 0 ? 'addition' : 'deduction'}`,
        earnedAt: new Date(),
        status: EarningStatus.CONFIRMED,
        metadata: {
          ...updateDto.metadata,
          source: 'external_stats_update',
          updatedAt: new Date().toISOString(),
        },
      });

      await this.earningsRepository.save(earning);

      // Update agent earnings
      agent.totalEarnings += updateDto.amount;
      agent.availableBalance += updateDto.amount;
      
      // Ensure balances don't go negative
      if (agent.availableBalance < 0) {
        agent.availableBalance = 0;
      }
      if (agent.totalEarnings < 0) {
        agent.totalEarnings = 0;
      }

      newBalance = agent.availableBalance;
      earningsUpdated = true;
    }

    // Update referrals if referralCount is provided
    if (updateDto.referralCount !== undefined && updateDto.referralCount !== null) {
      // Update referral counts
      agent.totalReferrals += updateDto.referralCount;
      agent.activeReferrals += updateDto.referralCount;
      
      // Ensure counts don't go negative
      if (agent.totalReferrals < 0) {
        agent.totalReferrals = 0;
      }
      if (agent.activeReferrals < 0) {
        agent.activeReferrals = 0;
      }

      newReferralTotal = agent.totalReferrals;
      referralsUpdated = true;
    }

    // Add metadata about the update
    if (earningsUpdated || referralsUpdated) {
      agent.metadata = {
        ...agent.metadata,
        lastStatsUpdate: {
          earningsAmount: updateDto.amount,
          referralCount: updateDto.referralCount,
          description: updateDto.description,
          updatedAt: new Date().toISOString(),
          source: 'external_stats_update',
          ...updateDto.metadata,
        },
      };

      await this.agentsRepository.save(agent);
    }

    const updates = [];
    if (earningsUpdated) updates.push(`earnings: $${updateDto.amount?.toFixed(2)}`);
    if (referralsUpdated) updates.push(`referrals: ${updateDto.referralCount}`);

    return {
      success: true,
      earningsUpdated,
      referralsUpdated,
      newBalance: earningsUpdated ? newBalance : undefined,
      newReferralTotal: referralsUpdated ? newReferralTotal : undefined,
      message: `Agent stats updated: ${updates.join(', ')}`,
    };
  }

  /**
   * Bulk update agent stats (earnings and/or referrals)
   */
  async bulkUpdateAgentStats(bulkDto: BulkUpdateAgentStatsDto): Promise<{ 
    success: number; 
    failed: number; 
    errors: any[]; 
    totalEarningsUpdated: number;
    totalReferralsUpdated: number;
  }> {
    const results = { 
      success: 0, 
      failed: 0, 
      errors: [], 
      totalEarningsUpdated: 0,
      totalReferralsUpdated: 0,
    };

    for (const update of bulkDto.updates) {
      try {
        const result = await this.updateAgentStats(update);
        if (result.success) {
          results.success++;
          if (update.amount) {
            results.totalEarningsUpdated += update.amount;
          }
          if (update.referralCount) {
            results.totalReferralsUpdated += update.referralCount;
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          agentId: update.agentId, 
          amount: update.amount,
          referralCount: update.referralCount,
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Update agent stats by agent code (earnings and/or referrals)
   */
  async updateAgentStatsByCode(updateDto: UpdateAgentStatsByCodeDto): Promise<{ 
    success: boolean; 
    agentId: string;
    agentCode: string;
    earningsUpdated: boolean;
    referralsUpdated: boolean;
    newBalance?: number; 
    newReferralTotal?: number;
    message: string;
  }> {
    // Find agent by code first
    const agent = await this.findByAgentCode(updateDto.agentCode);
    if (!agent) {
      throw new NotFoundException(`Agent with code ${updateDto.agentCode} not found`);
    }

    // Convert to ID-based DTO and call existing method
    const idBasedDto: UpdateAgentStatsDto = {
      agentId: agent.id,
      amount: updateDto.amount,
      referralCount: updateDto.referralCount,
      description: updateDto.description,
      metadata: updateDto.metadata,
    };

    const result = await this.updateAgentStats(idBasedDto);

    return {
      ...result,
      agentId: agent.id,
      agentCode: agent.agentCode,
    };
  }

  /**
   * Bulk update agent stats by agent codes
   */
  async bulkUpdateAgentStatsByCode(bulkDto: BulkUpdateAgentStatsByCodeDto): Promise<{ 
    success: number; 
    failed: number; 
    errors: any[]; 
    totalEarningsUpdated: number;
    totalReferralsUpdated: number;
  }> {
    const results = { 
      success: 0, 
      failed: 0, 
      errors: [], 
      totalEarningsUpdated: 0,
      totalReferralsUpdated: 0,
    };

    for (const update of bulkDto.updates) {
      try {
        const result = await this.updateAgentStatsByCode(update);
        if (result.success) {
          results.success++;
          if (update.amount) {
            results.totalEarningsUpdated += update.amount;
          }
          if (update.referralCount) {
            results.totalReferralsUpdated += update.referralCount;
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          agentCode: update.agentCode,
          amount: update.amount,
          referralCount: update.referralCount,
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Export payouts to CSV format
   */
  async exportPayouts(filters: {
    page?: number;
    limit?: number;
    format?: string;
    status?: string;
    method?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ csvContent?: string; data?: any[]; total: number }> {
    const { status, method, startDate, endDate } = filters;
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    
    const queryBuilder = this.payoutsRepository.createQueryBuilder('payout')
      .leftJoinAndSelect('payout.agent', 'agent')
      .leftJoinAndSelect('agent.user', 'user')
      .leftJoinAndSelect('payout.processor', 'processor');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('payout.status = :status', { status });
    }

    if (method) {
      queryBuilder.andWhere('payout.method = :method', { method });
    }

    if (startDate) {
      queryBuilder.andWhere('payout.requestedAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('payout.requestedAt <= :endDate', { endDate: new Date(endDate) });
    }

    const total = await queryBuilder.getCount();
    const payouts = await queryBuilder
      .orderBy('payout.requestedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    if (filters.format === 'csv') {
      const csvContent = this.generatePayoutCSV(payouts);
      return { csvContent, total };
    }

    return { data: payouts, total };
  }

  /**
   * Generate CSV content from payout data
   */
  private generatePayoutCSV(payouts: Payout[]): string {
    const headers = [
      'Payout ID',
      'Agent Code',
      'Agent Name',
      'Agent Email',
      'Status',
      'Method',
      'Amount',
      'Net Amount',
      'Fees',
      'Currency',
      'Description',
      'Requested Date',
      'Approved Date',
      'Transaction ID',
      'Payment Details',
      'Admin Notes',
      'Review Message'
    ];

    const rows = payouts.map(payout => [
      payout.id,
      payout.agent?.agentCode || 'N/A',
      payout.agent?.user ? `${payout.agent.user.firstName} ${payout.agent.user.lastName}` : 'N/A',
      payout.agent?.user?.email || 'N/A',
      payout.status,
      this.formatPaymentMethod(payout.method),
      payout.amount.toString(),
      payout.netAmount.toString(),
      payout.fees.toString(),
      payout.currency,
      payout.description || '',
      payout.requestedAt.toISOString(),
      payout.approvedAt?.toISOString() || '',
      payout.transactionId || '',
      this.formatPaymentDetailsForCSV(payout.paymentDetails),
      payout.adminNotes || '',
      payout.reviewMessage || ''
    ]);

    // Escape CSV values and join
    const escapeCsvValue = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvRows = [headers, ...rows].map(row => 
      row.map(cell => escapeCsvValue(cell.toString())).join(',')
    );

    return csvRows.join('\n');
  }

  /**
   * Format payment details for CSV export
   */
  private formatPaymentDetailsForCSV(paymentDetails: any): string {
    if (!paymentDetails) return '';

    if (paymentDetails.bankAccount) {
      const bank = paymentDetails.bankAccount;
      return `Bank: ${bank.bankName} | Account: ****${bank.accountNumber?.slice(-4)} | Name: ${bank.accountName}`;
    }

    if (paymentDetails.planettalkCredit) {
      const credit = paymentDetails.planettalkCredit;
      return `PlanetTalk: ${credit.planettalkMobile} | Name: ${credit.accountName || 'N/A'}`;
    }

    return 'Unknown payment method';
  }
}
