import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType, NotificationPriority } from './entities/notification.entity';
import { CreateNotificationDto, CreateBulkNotificationDto } from './dto/create-notification.dto';
import { EmailService } from '../email/email.service';
import { User, UserStatus } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ) {
    const query = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (unreadOnly) {
      query.andWhere('notification.read = false');
    }

    query
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [notifications, total] = await query.getManyAndCount();

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createNotification(createNotificationDto: CreateNotificationDto) {
    // Get user details for email sending
    const user = await this.usersRepository.findOne({
      where: { id: createNotificationDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const notification = this.notificationsRepository.create({
      ...createNotificationDto,
      expiresAt: createNotificationDto.expiresAt ? new Date(createNotificationDto.expiresAt) : null,
    });

    const savedNotification = await this.notificationsRepository.save(notification);

    // Auto-send email notification if user has email notifications enabled
    await this.sendEmailNotification(user, savedNotification);

    return savedNotification;
  }

  async createBulkNotifications(createBulkNotificationDto: CreateBulkNotificationDto) {
    const { userIds, ...notificationData } = createBulkNotificationDto;
    
    // Get all users for email sending
    const users = await this.usersRepository.findBy({
      id: In(userIds),
    });

    const notifications = userIds.map(userId => 
      this.notificationsRepository.create({
        ...notificationData,
        userId,
        expiresAt: notificationData.expiresAt ? new Date(notificationData.expiresAt) : null,
      })
    );

    const savedNotifications = await this.notificationsRepository.save(notifications);

    // Send email notifications to all users
    await Promise.all(
      users.map(async (user) => {
        const userNotification = savedNotifications.find(n => n.userId === user.id);
        if (userNotification) {
          await this.sendEmailNotification(user, userNotification);
        }
      })
    );

    return savedNotifications;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await this.notificationsRepository.save(notification);
    }

    return { success: true, message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ read: true, readAt: new Date() })
      .where('userId = :userId AND read = false', { userId })
      .execute();

    return { success: true, message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, read: false },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    const result = await this.notificationsRepository.delete({
      id: notificationId,
      userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Notification not found');
    }

    return { success: true, message: 'Notification deleted' };
  }

  async cleanupExpiredNotifications() {
    const result = await this.notificationsRepository
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('expiresAt IS NOT NULL AND expiresAt < :now', { now: new Date() })
      .execute();

    return { deleted: result.affected || 0 };
  }

  // Email notification sending
  private async sendEmailNotification(user: User, notification: Notification): Promise<void> {
    try {
      // Check if user has email notifications enabled (from metadata)
      const globalEmailEnabled = user.metadata?.emailNotifications !== false;
      
      if (!globalEmailEnabled) {
        return; // Skip email if global email notifications disabled
      }

      // Check specific notification type preferences
      const typeSpecificEnabled = this.isNotificationTypeEnabled(user, notification.type);
      if (!typeSpecificEnabled) {
        return; // Skip email if this specific notification type is disabled
      }

      const subject = this.getEmailSubject(notification);
      const template = this.getEmailTemplate(notification.type);

      await this.emailService.sendTemplateEmail(
        user.email,
        subject,
        template,
        {
          firstName: user.firstName,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText,
          priority: notification.priority,
          type: notification.type,
          dashboardUrl: process.env.NODE_ENV === 'production' 
            ? 'https://portal.planettalk.com/en/dashboard'
            : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/en/dashboard` : 'http://localhost:3001/en/dashboard'),
        }
      );
    } catch (error) {
      console.error('Failed to send email notification:', error);
      // Don't throw error - notification should still be saved even if email fails
    }
  }

  private getEmailSubject(notification: Notification): string {
    const typeSubjects = {
      [NotificationType.ANNOUNCEMENT]: '📢 Important Announcement',
      [NotificationType.TRAINING]: '📚 Training Update',
      [NotificationType.EARNINGS]: '💰 Earnings Update',
      [NotificationType.PAYOUT]: '💳 Payout Update',
      [NotificationType.APPLICATION]: '📝 Application Update',
      [NotificationType.SYSTEM]: '🔧 System Notification',
    };

    const baseSubject = typeSubjects[notification.type] || 'Notification';
    
    if (notification.priority === NotificationPriority.URGENT) {
      return `🚨 URGENT: ${notification.title}`;
    }
    
    return `${baseSubject}: ${notification.title}`;
  }

  private getEmailTemplate(type: NotificationType): string {
    const templateMap = {
      [NotificationType.ANNOUNCEMENT]: 'notification-announcement',
      [NotificationType.TRAINING]: 'notification-training',
      [NotificationType.EARNINGS]: 'notification-earnings',
      [NotificationType.PAYOUT]: 'payout-notification',
      [NotificationType.APPLICATION]: 'notification-application',
      [NotificationType.SYSTEM]: 'notification-system',
    };

    return templateMap[type] || 'notification-general';
  }

  private isNotificationTypeEnabled(user: User, type: NotificationType): boolean {
    if (!user.metadata) {
      return true; // Default to enabled if no preferences set
    }

    const typePreferences = {
      [NotificationType.PAYOUT]: user.metadata.payoutNotifications,
      [NotificationType.EARNINGS]: user.metadata.earningsNotifications,
      [NotificationType.TRAINING]: user.metadata.trainingNotifications,
      [NotificationType.ANNOUNCEMENT]: user.metadata.announcementNotifications,
      [NotificationType.APPLICATION]: user.metadata.applicationNotifications,
      [NotificationType.SYSTEM]: user.metadata.systemNotifications,
    };

    // Default to enabled (true) if preference is not explicitly set to false
    return typePreferences[type] !== false;
  }

  // Admin methods
  async createAnnouncementForRole(
    role: string,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    actionUrl?: string,
    actionText?: string,
    expiresAt?: string,
  ) {
    // Get all users with the specified role
    const users = await this.usersRepository.find({
      where: { role: role as any, status: UserStatus.ACTIVE },
    });

    if (users.length === 0) {
      return { success: false, message: `No active users found with role: ${role}` };
    }

    const userIds = users.map(user => user.id);

    await this.createBulkNotifications({
      userIds,
      type: NotificationType.ANNOUNCEMENT,
      priority,
      title,
      message,
      actionUrl,
      actionText,
      expiresAt,
    });

    return { 
      success: true, 
      message: `Announcement sent to ${users.length} users with role: ${role}`,
      recipientCount: users.length 
    };
  }

  async createAnnouncementForAllUsers(
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    actionUrl?: string,
    actionText?: string,
    expiresAt?: string,
  ) {
    // Get all active users
    const users = await this.usersRepository.find({
      where: { status: UserStatus.ACTIVE },
    });

    if (users.length === 0) {
      return { success: false, message: 'No active users found' };
    }

    const userIds = users.map(user => user.id);

    await this.createBulkNotifications({
      userIds,
      type: NotificationType.ANNOUNCEMENT,
      priority,
      title,
      message,
      actionUrl,
      actionText,
      expiresAt,
    });

    return { 
      success: true, 
      message: `Announcement sent to ${users.length} users`,
      recipientCount: users.length 
    };
  }

  async getNotificationStats() {
    const [
      total,
      totalUnread,
      byType,
      byPriority,
    ] = await Promise.all([
      this.notificationsRepository.count(),
      this.notificationsRepository.count({ where: { read: false } }),
      this.notificationsRepository
        .createQueryBuilder('notification')
        .select('notification.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('notification.type')
        .getRawMany(),
      this.notificationsRepository
        .createQueryBuilder('notification')
        .select('notification.priority', 'priority')
        .addSelect('COUNT(*)', 'count')
        .groupBy('notification.priority')
        .getRawMany(),
    ]);

    return {
      total,
      totalUnread,
      byType,
      byPriority,
    };
  }
}
