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
   * Register a new user with automatic agent and referral data creation
   * User starts as PENDING and receives welcome email with their login details
   */
  async register(registerData: { firstName: string; lastName: string; country: string; phoneNumber: string; email: string; password: string }): Promise<any> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: registerData.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash the user's chosen password (not a temporary one)
    const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '10'));
    const hashedPassword = await bcrypt.hash(registerData.password, saltRounds);

    const user = this.usersRepository.create({
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      country: registerData.country,
      phoneNumber: registerData.phoneNumber,
      email: registerData.email,
      passwordHash: hashedPassword,
      role: UserRole.AGENT,
      status: UserStatus.PENDING, // Start as PENDING verification
      username: registerData.email, // Username is the email
      isFirstLogin: true, // Mark for first login verification
      metadata: {
        registrationMethod: 'self_registration',
        userCreatedPassword: true,
        registeredAt: new Date().toISOString(),
        pendingApproval: true,
      },
    });

    const savedUser = await this.usersRepository.save(user);

    // Auto-create agent profile with referral data (but in PENDING status)
    const agentData = await this.agentsService.createPendingAgentWithReferralData(savedUser);

    // Generate and send email verification OTP instead of welcome email
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 15); // 15 minutes expiry

      // Save OTP to user metadata
      await this.update(savedUser.id, {
        metadata: {
          ...savedUser.metadata,
          emailVerificationOTP: otp,
          emailVerificationOTPExpiry: otpExpiry.toISOString(),
        },
      });

      // Send verification email
      await this.emailService.sendEmailVerificationOTP(
        savedUser.email,
        savedUser.firstName,
        otp
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    return {
      success: true,
      message: 'Registration successful! Please check your email for the verification code. After verification, you will receive your agent credentials and welcome information.',
      requiresEmailVerification: true,
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
      // Note: Don't return referral data until user is verified
      pendingVerification: true,
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
      select: ['id', 'email', 'firstName', 'lastName', 'country', 'role', 'status', 'createdAt', 'updatedAt'],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'country', 'role', 'status', 'createdAt', 'updatedAt'],
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

  async createUserAdmin(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: [{ email: createUserDto.email }, { username: createUserDto.username }],
    });

    if (existingUser) {
      throw new BadRequestException('User with this email or username already exists');
    }

    return this.create(createUserDto);
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
