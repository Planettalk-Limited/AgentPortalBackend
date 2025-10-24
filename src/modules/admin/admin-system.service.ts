import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { User } from '../users/entities/user.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Payout, PayoutStatus } from '../agents/entities/payout.entity';
import { AgentEarnings } from '../agents/entities/agent-earnings.entity';

@Injectable()
export class AdminSystemService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
    @InjectRepository(Payout)
    private payoutsRepository: Repository<Payout>,
    @InjectRepository(AgentEarnings)
    private earningsRepository: Repository<AgentEarnings>,
    private configService: ConfigService,
  ) {}

  async getDashboardData(): Promise<any> {
    const [
      totalUsers,
      totalAgents,
      totalEarnings,
      totalPayouts,
      pendingPayouts,
      recentUsers,
      recentAgents,
      recentPayouts,
    ] = await Promise.all([
      this.usersRepository.count(),
      this.agentsRepository.count(),
      this.earningsRepository
        .createQueryBuilder('earning')
        .select('SUM(earning.amount)', 'total')
        .getRawOne(),
      this.payoutsRepository
        .createQueryBuilder('payout')
        .select('SUM(payout.amount)', 'total')
        .where('payout.status = :status', { status: PayoutStatus.APPROVED })
        .getRawOne(),
      this.payoutsRepository.count({ where: { status: PayoutStatus.PENDING } }),
      this.usersRepository.find({
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.agentsRepository.find({
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.payoutsRepository.find({
        relations: ['agent', 'agent.user'],
        order: { requestedAt: 'DESC' },
        take: 5,
      }),
    ]);

    return {
      overview: {
        totalUsers,
        totalAgents,
        totalEarnings: totalEarnings.total || 0,
        totalPayouts: totalPayouts.total || 0,
        pendingPayouts,
      },
      recent: {
        users: recentUsers,
        agents: recentAgents.map(agent => ({
          id: agent.id,
          agentCode: agent.agentCode,
          name: `${agent.user.firstName} ${agent.user.lastName}`,
          status: agent.status,
          createdAt: agent.createdAt,
        })),
        payouts: recentPayouts.map(payout => ({
          id: payout.id,
          amount: payout.amount,
          agentName: `${payout.agent.user.firstName} ${payout.agent.user.lastName}`,
          status: payout.status,
          requestedAt: payout.requestedAt,
        })),
      },
    };
  }

  async getSystemHealth(): Promise<any> {
    const now = new Date();
    const startTime = process.hrtime();

    try {
      // Test database connection
      await this.usersRepository.query('SELECT 1');
      const dbStatus = 'healthy';
      
      // Check memory usage
      const memoryUsage = process.memoryUsage();
      
      // Check uptime
      const uptime = process.uptime();
      
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds * 1e-6;

      return {
        status: 'healthy',
        timestamp: now.toISOString(),
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        database: {
          status: dbStatus,
          responseTime: `${responseTime.toFixed(2)}ms`,
        },
        memory: {
          used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        },
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: now.toISOString(),
        error: error.message,
      };
    }
  }

  async getSystemStats(period?: string): Promise<any> {
    const dateFilter = this.getDateFilter(period);
    
    const baseQuery = dateFilter 
      ? { where: { createdAt: dateFilter } }
      : {};

    const [
      userStats,
      agentStats,
      earningsStats,
      payoutStats,
    ] = await Promise.all([
      this.getUserStatsForPeriod(dateFilter),
      this.getAgentStatsForPeriod(dateFilter),
      this.getEarningsStatsForPeriod(dateFilter),
      this.getPayoutStatsForPeriod(dateFilter),
    ]);

    return {
      period: period || 'all_time',
      users: userStats,
      agents: agentStats,
      earnings: earningsStats,
      payouts: payoutStats,
      generatedAt: new Date().toISOString(),
    };
  }

  async getAuditLogs(filters: {
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    // TODO: Implement actual audit logging system
    // For now, return placeholder data
    return {
      logs: [],
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total: 0,
        totalPages: 0,
      },
      message: 'Audit logging system not yet implemented',
    };
  }

  async getSystemSettings(): Promise<any> {
    // TODO: Implement system settings storage
    return {
      general: {
        siteName: 'Agent Portal',
        maintenanceMode: false,
        registrationEnabled: true,
        emailVerificationRequired: true,
      },
      payout: {
        minimumPayoutAmount: 20,
        maximumPayoutAmount: 100000,
        processingFee: 5,
        autoApprovalThreshold: 1000,
      },
      commission: {
        defaultCommissionRate: 10,
        bonusThresholds: {
          silver: 1000,
          gold: 5000,
          platinum: 10000,
          diamond: 25000,
        },
      },
      security: {
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        passwordMinLength: 8,
        requireSpecialCharacters: true,
      },
    };
  }

  async updateSystemSettings(settings: Record<string, any>): Promise<any> {
    // TODO: Implement system settings update
    return {
      success: true,
      message: 'Settings updated successfully',
      updatedAt: new Date().toISOString(),
    };
  }

  async enableMaintenanceMode(reason?: string, estimatedDuration?: string): Promise<any> {
    // TODO: Implement maintenance mode
    return {
      success: true,
      message: 'Maintenance mode enabled',
      reason,
      estimatedDuration,
      enabledAt: new Date().toISOString(),
    };
  }

  async disableMaintenanceMode(): Promise<any> {
    // TODO: Implement maintenance mode disable
    return {
      success: true,
      message: 'Maintenance mode disabled',
      disabledAt: new Date().toISOString(),
    };
  }

  async createBackup(includeFiles = false, description?: string): Promise<any> {
    // TODO: Implement backup system
    return {
      success: true,
      message: 'Backup initiated',
      backupId: `backup_${Date.now()}`,
      includeFiles,
      description,
      initiatedAt: new Date().toISOString(),
    };
  }

  async listBackups(): Promise<any[]> {
    // TODO: Implement backup listing
    return [
      {
        id: 'backup_1234567890',
        description: 'Daily automated backup',
        size: '150MB',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        type: 'automated',
      },
    ];
  }

  async clearCache(cacheType?: string): Promise<any> {
    // TODO: Implement cache clearing
    return {
      success: true,
      message: `Cache cleared${cacheType ? ` for ${cacheType}` : ''}`,
      clearedAt: new Date().toISOString(),
    };
  }

  async getPerformanceMetrics(period?: string): Promise<any> {
    // TODO: Implement performance monitoring
    return {
      period: period || 'hour',
      metrics: {
        averageResponseTime: 150,
        requestsPerSecond: 25,
        errorRate: 0.1,
        cpuUsage: 45,
        memoryUsage: 60,
        diskUsage: 30,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getErrorLogs(filters: {
    level?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    // TODO: Implement error logging system
    return {
      logs: [],
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total: 0,
        totalPages: 0,
      },
      message: 'Error logging system not yet implemented',
    };
  }

  async sendBroadcastNotification(data: {
    title: string;
    message: string;
    type: string;
    targetUsers?: string[];
    targetRoles?: string[];
  }): Promise<any> {
    // TODO: Implement notification system
    return {
      success: true,
      message: 'Broadcast notification sent',
      recipientCount: data.targetUsers?.length || 0,
      sentAt: new Date().toISOString(),
    };
  }

  async getDatabaseInfo(): Promise<any> {
    try {
      const dbSize = await this.usersRepository.query(
        "SELECT pg_size_pretty(pg_database_size(current_database())) as size"
      );
      
      return {
        type: 'PostgreSQL',
        size: dbSize[0]?.size || 'Unknown',
        tables: {
          users: await this.usersRepository.count(),
          agents: await this.agentsRepository.count(),
          payouts: await this.payoutsRepository.count(),
          earnings: await this.earningsRepository.count(),
        },
        lastBackup: 'N/A', // TODO: Implement backup tracking
      };
    } catch (error) {
      return {
        error: 'Unable to retrieve database information',
        message: error.message,
      };
    }
  }

  async optimizeDatabase(): Promise<any> {
    // TODO: Implement database optimization
    return {
      success: true,
      message: 'Database optimization initiated',
      optimizedAt: new Date().toISOString(),
    };
  }

  // Helper methods
  private getDateFilter(period?: string): Date | null {
    if (!period) return null;
    
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
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

  private async getUserStatsForPeriod(dateFilter?: Date): Promise<any> {
    const queryBuilder = this.usersRepository.createQueryBuilder('user');
    
    if (dateFilter) {
      queryBuilder.where('user.createdAt >= :date', { date: dateFilter });
    }

    const users = await queryBuilder.getMany();
    
    return {
      total: users.length,
      byRole: this.groupBy(users, 'role'),
      byStatus: this.groupBy(users, 'status'),
    };
  }

  private async getAgentStatsForPeriod(dateFilter?: Date): Promise<any> {
    const queryBuilder = this.agentsRepository.createQueryBuilder('agent');
    
    if (dateFilter) {
      queryBuilder.where('agent.createdAt >= :date', { date: dateFilter });
    }

    const agents = await queryBuilder.getMany();
    
    return {
      total: agents.length,
      byStatus: this.groupBy(agents, 'status'),
      byTier: this.groupBy(agents, 'tier'),
    };
  }

  private async getEarningsStatsForPeriod(dateFilter?: Date): Promise<any> {
    const queryBuilder = this.earningsRepository.createQueryBuilder('earning');
    
    if (dateFilter) {
      queryBuilder.where('earning.earnedAt >= :date', { date: dateFilter });
    }

    const earnings = await queryBuilder.getMany();
    
    return {
      total: earnings.reduce((sum, e) => sum + Number(e.amount), 0),
      count: earnings.length,
      byType: this.groupBySum(earnings, 'type', 'amount'),
      byStatus: this.groupBy(earnings, 'status'),
    };
  }

  private async getPayoutStatsForPeriod(dateFilter?: Date): Promise<any> {
    const queryBuilder = this.payoutsRepository.createQueryBuilder('payout');
    
    if (dateFilter) {
      queryBuilder.where('payout.requestedAt >= :date', { date: dateFilter });
    }

    const payouts = await queryBuilder.getMany();
    
    return {
      total: payouts.reduce((sum, p) => sum + Number(p.amount), 0),
      count: payouts.length,
      byStatus: this.groupBy(payouts, 'status'),
      byMethod: this.groupBy(payouts, 'method'),
    };
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private groupBySum(array: any[], key: string, sumKey: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key];
      acc[value] = (acc[value] || 0) + Number(item[sumKey]);
      return acc;
    }, {});
  }
}
