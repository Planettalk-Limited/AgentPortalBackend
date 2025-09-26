import { 
  IsString, 
  IsOptional, 
  IsEmail, 
  IsPhoneNumber, 
  MaxLength, 
  IsBoolean,
  IsObject,
  IsUrl,
  IsTimeZone
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ComprehensiveUpdateProfileDto {
  // Basic Information
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  // Profile Information
  @ApiPropertyOptional({ description: 'Profile bio or description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsUrl()
  avatar?: string;

  // Preferences
  @ApiPropertyOptional({ description: 'Email notifications enabled' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'SMS notifications enabled' })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Preferred language (e.g., en, es, fr)' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;

  @ApiPropertyOptional({ description: 'Timezone (e.g., America/New_York)' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Preferred currency (e.g., USD, EUR)' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  // Settings
  @ApiPropertyOptional({ description: 'Two-factor authentication enabled' })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Login notifications enabled' })
  @IsOptional()
  @IsBoolean()
  loginNotifications?: boolean;

  // Social Links
  @ApiPropertyOptional({ description: 'Social media links' })
  @IsOptional()
  @IsObject()
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };

  // Emergency Contact
  @ApiPropertyOptional({ description: 'Emergency contact information' })
  @IsOptional()
  @IsObject()
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };

  // Admin-specific (only for admin/pt_admin roles)
  @ApiPropertyOptional({ description: 'Department (admin only)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
}
