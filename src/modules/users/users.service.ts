import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { User, UserRole, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AgentsService } from '../agents/agents.service';
import { EmailService } from '../email/email.service';
import { PartnerRegistrationType } from '../auth/dto/register.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
    @Inject(forwardRef(() => AgentsService))
    private agentsService: AgentsService,
    private emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '10'));
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    const user = this.usersRepository.create({
      ...createUserDto,
      passwordHash: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  /**
   * Register a new user: individuals get a pending agent profile + auto-generated code;
   * business partners get user + business metadata only (no agent / code until admin approval).
   */
  async register(registerData: {
    firstName: string;
    lastName: string;
    country: string;
    phoneNumber?: string;
    email: string;
    password: string;
    partnerType?: PartnerRegistrationType;
    companyName?: string;
    businessAddress?: string;
    primaryBusinessActivity?: string;
    primarySpecialty?: string;
    customerInteractionType?: string;
    sellsInternationalGoods?: boolean;
    expectedVolume?: string;
    region?: string;
    companyRegistrationNumber?: string;
  }): Promise<any> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: registerData.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '10'));
    const hashedPassword = await bcrypt.hash(registerData.password, saltRounds);
    const phoneNumber = registerData.phoneNumber?.trim() || null;
    const isBusiness =
      registerData.partnerType === PartnerRegistrationType.BUSINESS;

    const meetingBookingUrl =
      this.configService.get<string>('PARTNER_MEETING_BOOKING_URL')?.trim() ||
      '';

    const user = this.usersRepository.create({
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      country: registerData.country,
      phoneNumber: phoneNumber,
      email: registerData.email,
      passwordHash: hashedPassword,
      role: UserRole.AGENT,
      status: UserStatus.PENDING,
      username: registerData.email,
      isFirstLogin: true,
      metadata: isBusiness
        ? {
            registrationMethod: 'self_registration_business',
            partnerType: 'business',
            userCreatedPassword: true,
            registeredAt: new Date().toISOString(),
            pendingApproval: true,
            business: {
              companyName: registerData.companyName,
              businessAddress: registerData.businessAddress ?? null,
              primaryBusinessActivity: registerData.primaryBusinessActivity ?? null,
              primarySpecialty: registerData.primarySpecialty ?? null,
              customerInteractionType: registerData.customerInteractionType ?? null,
              sellsInternationalGoods: registerData.sellsInternationalGoods ?? null,
              expectedVolume: registerData.expectedVolume ?? null,
              region: registerData.region ?? null,
              companyRegistrationNumber: registerData.companyRegistrationNumber ?? null,
            },
          }
        : {
            registrationMethod: 'self_registration',
            partnerType: 'individual',
            userCreatedPassword: true,
            registeredAt: new Date().toISOString(),
            pendingApproval: true,
          },
    });

    const savedUser = await this.usersRepository.save(user);

    let agentData: any = null;
    if (!isBusiness) {
      agentData =
        await this.agentsService.createPendingAgentWithReferralData(savedUser);
    } else {
      try {
        await this.emailService.sendBusinessApplicationAdminNotification({
          userId: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          phoneNumber: savedUser.phoneNumber,
          country: savedUser.country,
          companyName: registerData.companyName!,
          businessAddress: registerData.businessAddress ?? null,
          primaryBusinessActivity: registerData.primaryBusinessActivity ?? null,
          primarySpecialty: registerData.primarySpecialty ?? null,
          customerInteractionType: registerData.customerInteractionType ?? null,
          sellsInternationalGoods: registerData.sellsInternationalGoods ?? null,
          expectedVolume: registerData.expectedVolume ?? null,
          region: registerData.region ?? null,
          companyRegistrationNumber: registerData.companyRegistrationNumber ?? null,
          emailVerified: false,
        });
      } catch (err) {
        console.error('Failed to notify admins of business registration:', err);
      }
    }

    const portalUrl = this.emailService.getPartnerPortalBaseUrl();
    try {
      if (isBusiness) {
        await this.emailService.sendBusinessPartnerRegistrationAcknowledgement(
          savedUser.email,
          savedUser.firstName,
          registerData.companyName!,
          meetingBookingUrl,
          portalUrl,
        );
      } else {
        await this.emailService.sendIndividualPartnerRegistrationAcknowledgement(
          savedUser.email,
          savedUser.firstName,
          portalUrl,
        );
      }
    } catch (ackErr) {
      console.error('Failed to send registration acknowledgement email:', ackErr);
    }

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 15);

      const userForOtp = await this.findById(savedUser.id);
      await this.update(savedUser.id, {
        metadata: {
          ...userForOtp.metadata,
          emailVerificationOTP: otp,
          emailVerificationOTPExpiry: otpExpiry.toISOString(),
        },
      });

      await this.emailService.sendEmailVerificationOTP(
        userForOtp.email,
        userForOtp.firstName,
        otp,
        isBusiness ? 'business' : 'individual',
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    if (isBusiness) {
      return {
        success: true,
        partnerType: 'business',
        message:
          'Registration received. Please verify your email. Your application stays pending until our team approves it and assigns your partner code.',
        requiresEmailVerification: true,
        meetingBookingUrl,
        user: {
          id: savedUser.id,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          email: savedUser.email,
          status: savedUser.status,
          emailVerified: false,
          createdAt: savedUser.createdAt,
        },
        pendingVerification: true,
      };
    }

    return {
      success: true,
      partnerType: 'individual',
      message:
        'Registration successful! Please check your email for the verification code. After verification, you will receive your partner credentials and welcome information.',
      requiresEmailVerification: true,
      meetingBookingUrl,
      user: {
        id: savedUser.id,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
        status: savedUser.status,
        emailVerified: false,
        createdAt: savedUser.createdAt,
      },
      agent: {
        agentCode: agentData.agent.agentCode,
        tier: agentData.agent.tier,
        commissionRate: agentData.agent.commissionRate,
        status: agentData.agent.status,
      },
      pendingVerification: true,
    };
  }

  getPartnerMeetingBookingUrl(): string {
    return (
      this.configService.get<string>('PARTNER_MEETING_BOOKING_URL')?.trim() || ''
    );
  }

  async listPendingBusinessPartners(): Promise<Partial<User>[]> {
    const rows = await this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.country',
        'user.phoneNumber',
        'user.status',
        'user.metadata',
        'user.createdAt',
        'user.updatedAt',
      ])
      .where('user.status = :status', {
        status: UserStatus.AWAITING_PARTNER_APPROVAL,
      })
      .andWhere(`"user".metadata->>'partnerType' = :pt`, { pt: 'business' })
      .orderBy('user.createdAt', 'DESC')
      .getMany();

    return rows;
  }

  async approveBusinessPartner(userId: string, partnerCode: string) {
    const user = await this.findByIdWithRelations(userId);
    if (user.metadata?.partnerType !== 'business') {
      throw new BadRequestException('User is not a business partner registration');
    }
    if (user.status !== UserStatus.AWAITING_PARTNER_APPROVAL) {
      throw new BadRequestException(
        'User must be awaiting partner approval (email verified)',
      );
    }
    if (user.agents?.length) {
      throw new BadRequestException('Partner profile already exists for this user');
    }

    const agent = await this.agentsService.createPartnerWithAssignedCode(
      user.id,
      partnerCode,
    );

   
    const updatedMetadata: Record<string, any> = {
      ...user.metadata,
      pendingApproval: false,
      partnerApprovedAt: new Date().toISOString(),
    };
    await this.usersRepository.update(userId, {
      status: UserStatus.ACTIVE,
      isFirstLogin: false,
      metadata: updatedMetadata,
    });

    const loginUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://portal.planettalk.com/en'
        : this.configService.get('FRONTEND_URL')
          ? `${this.configService.get('FRONTEND_URL')}/en`
          : 'http://localhost:3001/en';

    const companyName =
      (user.metadata?.business as { companyName?: string })?.companyName ||
      'Your organisation';
    const meetingBookingUrl = this.getPartnerMeetingBookingUrl();

    try {
      await this.emailService.sendBusinessPartnerWelcomeEmail({
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        username: user.email,
        companyName,
        agentCode: agent.agentCode,
        commissionRate: agent.commissionRate.toString(),
        tier: agent.tier,
        minimumPayout: '20',
        payoutProcessing: 'Monthly on the 15th',
        loginUrl,
        supportEmail: 'agent@planettalk.com',
        meetingBookingUrl,
      });
    } catch (e) {
      console.error('Failed to send partner onboarding email:', e);
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        status: UserStatus.ACTIVE,
      },
      agent: {
        id: agent.id,
        agentCode: agent.agentCode,
        status: agent.status,
      },
    };
  }

  async rejectBusinessPartner(userId: string, reason?: string) {
    const user = await this.findById(userId);
    if (user.metadata?.partnerType !== 'business') {
      throw new BadRequestException('User is not a business partner registration');
    }
    if (
      user.status !== UserStatus.AWAITING_PARTNER_APPROVAL &&
      user.status !== UserStatus.PENDING
    ) {
      throw new BadRequestException(
        'User must be pending or awaiting partner approval to be rejected',
      );
    }

    user.status = UserStatus.REJECTED;
    user.metadata = {
      ...user.metadata,
      pendingApproval: false,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason || null,
    };

    await this.usersRepository.save(user);

    const companyName =
      (user.metadata?.business as { companyName?: string })?.companyName ||
      'Your organisation';

    try {
      await this.emailService.sendBusinessPartnerRejectionEmail({
        email: user.email,
        firstName: user.firstName,
        companyName,
        reason,
      });
    } catch (e) {
      console.error('Failed to send partner rejection email:', e);
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      message: `Business partner application for ${companyName} has been rejected.`,
    };
  }

  /**
   * Get user's agents
   */
  async getUserAgents(userId: string): Promise<any[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['agents'],
    });
    
    return user?.agents || [];
  }

  /**
   * Approve user registration on first successful login
   */
  async approveUserOnFirstLogin(userId: string): Promise<any> {
    const user = await this.findByIdWithRelations(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException('User is not in pending status');
    }

    // Activate user
    user.status = UserStatus.ACTIVE;
    user.isFirstLogin = false;
    user.metadata = {
      ...user.metadata,
      approvedAt: new Date().toISOString(),
      approvedBy: 'first_login',
      pendingApproval: false,
    };

    const savedUser = await this.usersRepository.save(user);

    // Activate agent profile and get referral data
    const agentData = await this.agentsService.activateAgentOnFirstLogin(savedUser);

    return {
      user: {
        id: savedUser.id,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
        role: savedUser.role,
        status: savedUser.status,
        updatedAt: savedUser.updatedAt,
      },
      ...agentData.referralData, // Now include the complete referral data structure
      message: 'Welcome! Your agent account has been activated.',
    };
  }

  /**
   * Generate a unique username from first and last name
   */
  private generateUsername(firstName: string, lastName: string): string {
    const baseUsername = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${baseUsername}${randomSuffix}`;
  }


  /**
   * Clean up pending registrations older than 3 days
   */
  async cleanupExpiredPendingRegistrations(): Promise<{ deletedCount: number; message: string }> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Find pending users older than 3 days
    const expiredUsers = await this.usersRepository.createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.PENDING })
      .andWhere('user.createdAt < :cutoffDate', { cutoffDate: threeDaysAgo })
      .getMany();

    if (expiredUsers.length === 0) {
      return {
        deletedCount: 0,
        message: 'No expired pending registrations to clean up'
      };
    }

    // Delete the expired users (this will cascade delete their agent profiles)
    const userIds = expiredUsers.map(user => user.id);
    const result = await this.usersRepository.delete(userIds);

    console.log(`Cleaned up ${result.affected} expired pending registrations`);

    return {
      deletedCount: result.affected || 0,
      message: `Successfully cleaned up ${result.affected} expired pending registrations`
    };
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'email', 'firstName', 'lastName', 'country', 'role', 'status', 'metadata', 'createdAt', 'updatedAt'],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'country', 'role', 'status', 'metadata', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByIdWithPassword(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'country', 'role', 'status', 'passwordHash', 'metadata', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByIdWithRelations(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['agents'],
      select: [
        'id', 
        'email', 
        'firstName', 
        'lastName',
        'country',
        'username',
        'role', 
        'status', 
        'phoneNumber',
        'lastLoginAt',
        'emailVerifiedAt',
        'isFirstLogin',
        'metadata',
        'createdAt', 
        'updatedAt'
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (updateUserDto.password) {
      const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '10'));
      const hashedPassword = await bcrypt.hash(updateUserDto.password, saltRounds);
      // Remove password and add passwordHash
      const { password, ...updateData } = updateUserDto;
      Object.assign(user, { ...updateData, passwordHash: hashedPassword });
    } else {
      Object.assign(user, updateUserDto);
    }

    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
  }

  // Admin Methods
  async getAllUsersAdmin(filters: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const { role, status, search } = filters;
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;

    const queryBuilder = this.usersRepository.createQueryBuilder('user')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.country',
        'user.email',
        'user.username',
        'user.role',
        'user.status',
        'user.phoneNumber',
        'user.lastLoginAt',
        'user.emailVerifiedAt',
        'user.isFirstLogin',
        'user.createdAt',
        'user.updatedAt',
      ]);

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search OR user.username ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await queryBuilder.getCount();
    const users = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Calculate global metrics (unfiltered)
    const globalMetrics = await this.calculateUserMetrics();

    return {
      users,
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
   * Calculate global user metrics/statistics
   */
  private async calculateUserMetrics(): Promise<any> {
    // Get total counts by status
    const totalUsers = await this.usersRepository.count();
    const activeUsers = await this.usersRepository.count({ where: { status: UserStatus.ACTIVE } });
    const pendingUsers = await this.usersRepository.count({ where: { status: UserStatus.PENDING } });
    const inactiveUsers = await this.usersRepository.count({ where: { status: UserStatus.INACTIVE } });
    const suspendedUsers = await this.usersRepository.count({ where: { status: UserStatus.SUSPENDED } });

    // Get counts by role
    const roleBreakdown = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    // Process role counts into a more usable format
    const roleMetrics = {
      admin: 0,
      pt_admin: 0,
      agent: 0,
    };

    roleBreakdown.forEach(row => {
      if (roleMetrics.hasOwnProperty(row.role)) {
        roleMetrics[row.role] = parseInt(row.count);
      }
    });

    // Calculate admin total (admin + pt_admin)
    const totalAdmins = roleMetrics.admin + roleMetrics.pt_admin;

    return {
      overview: {
        totalUsers,
        activeUsers,
        pendingUsers,
        inactiveUsers,
        suspendedUsers,
      },
      roleBreakdown: {
        admins: totalAdmins,
        agents: roleMetrics.agent,
        breakdown: {
          admin: roleMetrics.admin,
          pt_admin: roleMetrics.pt_admin,
          agent: roleMetrics.agent,
        },
      },
      statusSummary: {
        active: activeUsers,
        pending: pendingUsers,
        inactive: inactiveUsers,
        suspended: suspendedUsers,
      },
    };
  }

  async getUserStats(): Promise<any> {
    const totalUsers = await this.usersRepository.count();
    const activeUsers = await this.usersRepository.count({ where: { status: UserStatus.ACTIVE } });
    const pendingUsers = await this.usersRepository.count({ where: { status: UserStatus.PENDING } });
    const suspendedUsers = await this.usersRepository.count({ where: { status: UserStatus.SUSPENDED } });

    const usersByRole = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.role, COUNT(*) as count')
      .groupBy('user.role')
      .getRawMany();

    const recentUsers = await this.usersRepository.find({
      select: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item.user_role] = parseInt(item.count);
        return acc;
      }, {}),
      recentUsers,
    };
  }

  /**
   * Admin-created users with full setup:
   * - Email is auto-verified
   * - Status is set to ACTIVE
   * - Role defaults to ADMIN (can be overridden)
   * - No first login flow required
   * - Ready to use immediately
   */
  async createUserAdmin(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: [{ email: createUserDto.email }, { username: createUserDto.username }],
    });

    if (existingUser) {
      throw new BadRequestException('User with this email or username already exists');
    }

    // Hash password
    const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '10'));
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Create fully setup user with admin override
    const user = this.usersRepository.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      country: createUserDto.country,
      username: createUserDto.username,
      email: createUserDto.email,
      passwordHash: hashedPassword,
      phoneNumber: createUserDto.phoneNumber,
      // Admin overrides - full setup
      role: createUserDto.role || UserRole.ADMIN, // Default to ADMIN
      status: UserStatus.ACTIVE, // Auto-activate
      emailVerifiedAt: new Date(), // Auto-verify email
      isFirstLogin: false, // Skip first login flow
      metadata: {
        createdBy: 'admin',
        createdVia: 'admin_panel',
        adminCreatedFullySetup: true,
        emailAutoVerified: true,
        skipFirstLoginFlow: true,
        createdAt: new Date().toISOString(),
      },
    });

    const savedUser = await this.usersRepository.save(user);

    console.log(`[ADMIN] Fully setup user created: ${savedUser.email} (${savedUser.role}) - ID: ${savedUser.id}`);

    return savedUser;
  }

  async updateUserRole(id: string, newRole: string, reason?: string): Promise<User> {
    const user = await this.findById(id);
    const oldRole = user.role;

    if (!Object.values(UserRole).includes(newRole as UserRole)) {
      throw new BadRequestException('Invalid role specified');
    }

    user.role = newRole as UserRole;
    user.metadata = {
      ...user.metadata,
      roleChanges: [
        ...(user.metadata?.roleChanges || []),
        {
          from: oldRole,
          to: newRole,
          reason,
          changedAt: new Date().toISOString(),
          changedBy: 'admin', // In real app, get from JWT token
        },
      ],
    };

    return this.usersRepository.save(user);
  }

  async updateUserStatus(id: string, newStatus: string, reason?: string): Promise<User> {
    const user = await this.findById(id);
    const oldStatus = user.status;

    if (!Object.values(UserStatus).includes(newStatus as UserStatus)) {
      throw new BadRequestException('Invalid status specified');
    }

    user.status = newStatus as UserStatus;
    user.metadata = {
      ...user.metadata,
      statusChanges: [
        ...(user.metadata?.statusChanges || []),
        {
          from: oldStatus,
          to: newStatus,
          reason,
          changedAt: new Date().toISOString(),
          changedBy: 'admin',
        },
      ],
    };

    return this.usersRepository.save(user);
  }

  async resetUserPasswordAdmin(id: string, temporaryPassword?: string, sendEmail = true): Promise<{ success: boolean; temporaryPassword?: string }> {
    const user = await this.findById(id);
    
    const newPassword = temporaryPassword || crypto.randomBytes(8).toString('hex');
    const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '10'));
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.passwordHash = hashedPassword;
    user.isFirstLogin = true; // Force password change on next login
    user.metadata = {
      ...user.metadata,
      passwordResetBy: 'admin',
      passwordResetAt: new Date().toISOString(),
      requirePasswordChange: true,
    };

    await this.usersRepository.save(user);

    // TODO: Send email with new password if sendEmail is true
    if (sendEmail) {
      // Implement email sending logic
    }

    return {
      success: true,
      temporaryPassword: newPassword, // Remove in production
    };
  }

  async forcePasswordChange(id: string, reason?: string): Promise<User> {
    const user = await this.findById(id);
    
    user.isFirstLogin = true;
    user.metadata = {
      ...user.metadata,
      requirePasswordChange: true,
      passwordChangeReason: reason,
      passwordChangeForced: true,
      passwordChangeForcedAt: new Date().toISOString(),
      passwordChangeForcedBy: 'admin',
    };

    return this.usersRepository.save(user);
  }

  async unlockUser(id: string, reason?: string): Promise<User> {
    const user = await this.findById(id);
    
    if (user.status !== UserStatus.SUSPENDED) {
      throw new BadRequestException('User is not locked/suspended');
    }

    user.status = UserStatus.ACTIVE;
    user.metadata = {
      ...user.metadata,
      unlockedBy: 'admin',
      unlockedAt: new Date().toISOString(),
      unlockReason: reason,
    };

    return this.usersRepository.save(user);
  }

  async deleteUser(id: string, reason?: string, forceDelete = false): Promise<{ success: boolean; message: string }> {
    const user = await this.findById(id);

    // Check if user has associated data (agents, payouts, etc.)
    // In a real implementation, you'd check for related records
    const hasActiveData = false; // TODO: Implement actual check

    if (hasActiveData && !forceDelete) {
      throw new BadRequestException('Cannot delete user with active data. Use forceDelete option if necessary.');
    }

    // Soft delete by marking as inactive and anonymizing data
    if (!forceDelete) {
      user.status = UserStatus.INACTIVE;
      user.email = `deleted_${user.id}@example.com`;
      user.firstName = 'Deleted';
      user.lastName = 'User';
      user.username = `deleted_${user.id}`;
      user.metadata = {
        ...user.metadata,
        deletedBy: 'admin',
        deletedAt: new Date().toISOString(),
        deleteReason: reason,
        originalEmail: user.email,
      };
      
      await this.usersRepository.save(user);
      return { success: true, message: 'User soft deleted successfully' };
    } else {
      // Hard delete
      await this.usersRepository.remove(user);
      return { success: true, message: 'User permanently deleted' };
    }
  }

  async bulkUserActions(userIds: string[], action: string, parameters?: any): Promise<{ success: number; failed: number; errors: any[] }> {
    const results = { success: 0, failed: 0, errors: [] };

    for (const id of userIds) {
      try {
        switch (action) {
          case 'updateStatus':
            await this.updateUserStatus(id, parameters.status, parameters.reason);
            break;
          case 'updateRole':
            await this.updateUserRole(id, parameters.role, parameters.reason);
            break;
          case 'resetPassword':
            await this.resetUserPasswordAdmin(id, undefined, parameters.sendEmail);
            break;
          case 'forcePasswordChange':
            await this.forcePasswordChange(id, parameters.reason);
            break;
          case 'unlock':
            await this.unlockUser(id, parameters.reason);
            break;
          case 'delete':
            await this.deleteUser(id, parameters.reason, parameters.forceDelete);
            break;
          default:
            throw new BadRequestException(`Unknown action: ${action}`);
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }

    return results;
  }

  async getUserActivityLog(id: string, limit = 50): Promise<any[]> {
    const user = await this.findById(id);
    
    // TODO: Implement actual activity logging
    // For now, return metadata-based activity
    const activities = [];
    
    if (user.metadata?.roleChanges) {
      user.metadata.roleChanges.forEach(change => {
        activities.push({
          type: 'role_change',
          description: `Role changed from ${change.from} to ${change.to}`,
          reason: change.reason,
          timestamp: change.changedAt,
          performedBy: change.changedBy,
        });
      });
    }

    if (user.metadata?.statusChanges) {
      user.metadata.statusChanges.forEach(change => {
        activities.push({
          type: 'status_change',
          description: `Status changed from ${change.from} to ${change.to}`,
          reason: change.reason,
          timestamp: change.changedAt,
          performedBy: change.changedBy,
        });
      });
    }

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getUserLoginHistory(id: string, limit = 50): Promise<any[]> {
    const user = await this.findById(id);
    
    // TODO: Implement actual login history tracking
    // For now, return basic info
    return [
      {
        timestamp: user.lastLoginAt,
        ipAddress: 'N/A',
        userAgent: 'N/A',
        success: true,
      },
    ].filter(login => login.timestamp);
  }
}
