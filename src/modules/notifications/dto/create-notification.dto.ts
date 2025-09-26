import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationPriority } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ enum: NotificationPriority, description: 'Priority level' })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Action URL for notification' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Action button text' })
  @IsOptional()
  @IsString()
  actionText?: string;

  @ApiPropertyOptional({ description: 'Expiration date for notification' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CreateBulkNotificationDto {
  @ApiProperty({ description: 'Array of user IDs to send notification to' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  userIds: string[];

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ enum: NotificationPriority, description: 'Priority level' })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Action URL for notification' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Action button text' })
  @IsOptional()
  @IsString()
  actionText?: string;

  @ApiPropertyOptional({ description: 'Expiration date for notification' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
