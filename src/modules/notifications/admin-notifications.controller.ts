import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, CreateBulkNotificationDto } from './dto/create-notification.dto';

@ApiTags('Admin - Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Send notification to specific user' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid notification data' })
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.createNotification(createNotificationDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Send bulk notifications to multiple users' })
  @ApiResponse({ status: 201, description: 'Notifications sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid notification data' })
  async createBulkNotifications(@Body() createBulkNotificationDto: CreateBulkNotificationDto) {
    return this.notificationsService.createBulkNotifications(createBulkNotificationDto);
  }

  @Post('announcement/role')
  @ApiOperation({ summary: 'Send announcement to all users with specific role' })
  @ApiResponse({ status: 201, description: 'Announcement sent successfully' })
  async createRoleAnnouncement(@Body() data: {
    role: string;
    title: string;
    message: string;
    priority?: string;
    actionUrl?: string;
    actionText?: string;
    expiresAt?: string;
  }) {
    return this.notificationsService.createAnnouncementForRole(
      data.role,
      data.title,
      data.message,
      data.priority as any,
      data.actionUrl,
      data.actionText,
      data.expiresAt,
    );
  }

  @Post('announcement/all')
  @ApiOperation({ summary: 'Send announcement to all users' })
  @ApiResponse({ status: 201, description: 'Announcement sent successfully' })
  async createGlobalAnnouncement(@Body() data: {
    title: string;
    message: string;
    priority?: string;
    actionUrl?: string;
    actionText?: string;
    expiresAt?: string;
  }) {
    return this.notificationsService.createAnnouncementForAllUsers(
      data.title,
      data.message,
      data.priority as any,
      data.actionUrl,
      data.actionText,
      data.expiresAt,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Notification statistics' })
  async getNotificationStats() {
    return this.notificationsService.getNotificationStats();
  }

  @Post('cleanup-expired')
  @ApiOperation({ summary: 'Clean up expired notifications' })
  @ApiResponse({ status: 200, description: 'Expired notifications cleaned up' })
  async cleanupExpiredNotifications() {
    return this.notificationsService.cleanupExpiredNotifications();
  }
}
