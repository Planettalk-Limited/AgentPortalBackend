import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsPositive,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReferralCodeType,
  ReferralCodeStatus,
} from '../entities/referral-code.entity';

export class CreateReferralCodeDto {
  @ApiPropertyOptional({ description: 'Custom referral code (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({
    description: 'Type of referral code',
    enum: ReferralCodeType,
    default: ReferralCodeType.STANDARD,
  })
  @IsOptional()
  @IsEnum(ReferralCodeType)
  type?: ReferralCodeType;

  @ApiPropertyOptional({ description: 'Description of the referral code' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'Bonus commission rate (percentage)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  bonusCommissionRate?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of uses (null for unlimited)',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Initial status',
    enum: ReferralCodeStatus,
    default: ReferralCodeStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ReferralCodeStatus)
  status?: ReferralCodeStatus;
}
