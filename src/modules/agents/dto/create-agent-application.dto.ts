import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsEnum,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationSource } from '../entities/agent-application.entity';

export class CreateAgentApplicationDto {
  @ApiProperty({ description: 'First name of the applicant' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name of the applicant' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ description: 'Email address of the applicant' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Phone number of the applicant' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Full address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'ZIP/Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Previous experience in sales/insurance' })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({ description: 'Motivation for becoming an agent' })
  @IsOptional()
  @IsString()
  motivation?: string;

  @ApiPropertyOptional({ description: 'Current employment status' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentEmployment?: string;

  @ApiPropertyOptional({ description: 'Whether applicant has a license' })
  @IsOptional()
  @IsBoolean()
  hasLicense?: boolean;

  @ApiPropertyOptional({ description: 'License number if applicable' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;

  @ApiPropertyOptional({ description: 'License expiry date' })
  @IsOptional()
  @IsDateString()
  licenseExpiryDate?: string;

  @ApiPropertyOptional({
    description: 'Application source',
    enum: ApplicationSource,
  })
  @IsOptional()
  @IsEnum(ApplicationSource)
  source?: ApplicationSource;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
