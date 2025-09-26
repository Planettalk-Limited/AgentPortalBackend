import { IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdatePreferencesDto {
  // Notification Preferences
  @ApiPropertyOptional({ 
    description: 'Enable/disable email notifications',
    example: true 
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ 
    description: 'Enable/disable SMS notifications',
    example: false 
  })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ 
    description: 'Enable/disable login notifications',
    example: true 
  })
  @IsOptional()
  @IsBoolean()
  loginNotifications?: boolean;

  // Localization Preferences
  @ApiPropertyOptional({ 
    description: 'Preferred language code',
    example: 'en' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;

  @ApiPropertyOptional({ 
    description: 'Timezone preference',
    example: 'America/New_York' 
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ 
    description: 'Preferred currency code',
    example: 'USD' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class UpdateSecuritySettingsDto {
  // Security Settings
  @ApiPropertyOptional({ 
    description: 'Enable/disable two-factor authentication',
    example: false 
  })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({ 
    description: 'Force password change on next login',
    example: false 
  })
  @IsOptional()
  @IsBoolean()
  requirePasswordChange?: boolean;
}

export class EmailNotificationSettings {
  @ApiPropertyOptional({ description: 'Earnings email notifications' })
  @IsOptional()
  @IsBoolean()
  earnings?: boolean;

  @ApiPropertyOptional({ description: 'Marketing email notifications' })
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;

  @ApiPropertyOptional({ description: 'Payout email notifications' })
  @IsOptional()
  @IsBoolean()
  payouts?: boolean;

  @ApiPropertyOptional({ description: 'System email notifications' })
  @IsOptional()
  @IsBoolean()
  system?: boolean;

  @ApiPropertyOptional({ description: 'Training email notifications' })
  @IsOptional()
  @IsBoolean()
  training?: boolean;
}

export class SmsNotificationSettings {
  @ApiPropertyOptional({ description: 'Payout SMS notifications' })
  @IsOptional()
  @IsBoolean()
  payouts?: boolean;

  @ApiPropertyOptional({ description: 'Security SMS notifications' })
  @IsOptional()
  @IsBoolean()
  security?: boolean;

  @ApiPropertyOptional({ description: 'Urgent SMS notifications' })
  @IsOptional()
  @IsBoolean()
  urgent?: boolean;
}

export class PushNotificationSettings {
  @ApiPropertyOptional({ description: 'Push notifications enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Earnings push notifications' })
  @IsOptional()
  @IsBoolean()
  earnings?: boolean;

  @ApiPropertyOptional({ description: 'Payout push notifications' })
  @IsOptional()
  @IsBoolean()
  payouts?: boolean;

  @ApiPropertyOptional({ description: 'Training push notifications' })
  @IsOptional()
  @IsBoolean()
  training?: boolean;
}

export class SpecificNotificationSettings {
  @ApiPropertyOptional({ description: 'Announcement notifications' })
  @IsOptional()
  @IsBoolean()
  announcementNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Application notifications' })
  @IsOptional()
  @IsBoolean()
  applicationNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Earnings notifications' })
  @IsOptional()
  @IsBoolean()
  earningsNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Payout notifications' })
  @IsOptional()
  @IsBoolean()
  payoutNotifications?: boolean;

  @ApiPropertyOptional({ description: 'System notifications' })
  @IsOptional()
  @IsBoolean()
  systemNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Training notifications' })
  @IsOptional()
  @IsBoolean()
  trainingNotifications?: boolean;
}

export class NotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Master email notifications toggle' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Master SMS notifications toggle' })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Login notifications toggle' })
  @IsOptional()
  @IsBoolean()
  loginNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Email notification settings by type' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailNotificationSettings)
  email?: EmailNotificationSettings;

  @ApiPropertyOptional({ description: 'SMS notification settings by type' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SmsNotificationSettings)
  sms?: SmsNotificationSettings;

  @ApiPropertyOptional({ description: 'Push notification settings' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PushNotificationSettings)
  push?: PushNotificationSettings;

  @ApiPropertyOptional({ description: 'Specific notification settings (legacy)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SpecificNotificationSettings)
  specificNotifications?: SpecificNotificationSettings;
}
