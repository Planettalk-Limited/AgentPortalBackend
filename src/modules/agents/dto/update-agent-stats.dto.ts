import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAgentEarningsDto {
  @ApiProperty({ description: 'Agent ID' })
  @IsUUID()
  agentId: string;

  @ApiProperty({ 
    description: 'Earnings amount to add (can be negative for deductions)',
    minimum: -100000,
    maximum: 100000 
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-100000, { message: 'Minimum earnings adjustment is -$100,000' })
  @Max(100000, { message: 'Maximum earnings adjustment is $100,000' })
  amount: number;

  @ApiPropertyOptional({ description: 'Description of the earnings update' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateAgentReferralsDto {
  @ApiProperty({ description: 'Agent ID' })
  @IsUUID()
  agentId: string;

  @ApiProperty({ 
    description: 'Number of referrals to add (can be negative for corrections)',
    minimum: -1000,
    maximum: 1000 
  })
  @IsNumber()
  @Min(-1000, { message: 'Minimum referral adjustment is -1000' })
  @Max(1000, { message: 'Maximum referral adjustment is 1000' })
  referralCount: number;

  @ApiPropertyOptional({ description: 'Description of the referral update' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkUpdateEarningsDto {
  @ApiProperty({ 
    description: 'Array of earnings updates',
    type: [UpdateAgentEarningsDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAgentEarningsDto)
  updates: UpdateAgentEarningsDto[];

  @ApiPropertyOptional({ description: 'Batch description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  batchDescription?: string;
}

export class BulkUpdateReferralsDto {
  @ApiProperty({ 
    description: 'Array of referral updates',
    type: [UpdateAgentReferralsDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAgentReferralsDto)
  updates: UpdateAgentReferralsDto[];

  @ApiPropertyOptional({ description: 'Batch description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  batchDescription?: string;
}

export class UpdateAgentStatsDto {
  @ApiProperty({ description: 'Agent ID' })
  @IsUUID()
  agentId: string;

  @ApiPropertyOptional({ 
    description: 'Earnings amount to add (can be negative for deductions)',
    minimum: -100000,
    maximum: 100000 
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-100000, { message: 'Minimum earnings adjustment is -$100,000' })
  @Max(100000, { message: 'Maximum earnings adjustment is $100,000' })
  amount?: number;

  @ApiPropertyOptional({ 
    description: 'Number of referrals to add (can be negative for corrections)',
    minimum: -1000,
    maximum: 1000 
  })
  @IsOptional()
  @IsNumber()
  @Min(-1000, { message: 'Minimum referral adjustment is -1000' })
  @Max(1000, { message: 'Maximum referral adjustment is 1000' })
  referralCount?: number;

  @ApiPropertyOptional({ description: 'Description of the update' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkUpdateAgentStatsDto {
  @ApiProperty({ 
    description: 'Array of agent stats updates',
    type: [UpdateAgentStatsDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAgentStatsDto)
  updates: UpdateAgentStatsDto[];

  @ApiPropertyOptional({ description: 'Batch description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  batchDescription?: string;
}

// Agent Code-based DTOs
export class UpdateAgentStatsByCodeDto {
  @ApiProperty({ description: 'Agent Code (e.g., AGT15616)' })
  @IsString()
  @MaxLength(20)
  agentCode: string;

  @ApiPropertyOptional({ 
    description: 'Earnings amount to add (can be negative for deductions)',
    minimum: -100000,
    maximum: 100000 
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-100000, { message: 'Minimum earnings adjustment is -$100,000' })
  @Max(100000, { message: 'Maximum earnings adjustment is $100,000' })
  amount?: number;

  @ApiPropertyOptional({ 
    description: 'Number of referrals to add (can be negative for corrections)',
    minimum: -1000,
    maximum: 1000 
  })
  @IsOptional()
  @IsNumber()
  @Min(-1000, { message: 'Minimum referral adjustment is -1000' })
  @Max(1000, { message: 'Maximum referral adjustment is 1000' })
  referralCount?: number;

  @ApiPropertyOptional({ description: 'Description of the update' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkUpdateAgentStatsByCodeDto {
  @ApiProperty({ 
    description: 'Array of agent stats updates by code',
    type: [UpdateAgentStatsByCodeDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAgentStatsByCodeDto)
  updates: UpdateAgentStatsByCodeDto[];

  @ApiPropertyOptional({ description: 'Batch description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  batchDescription?: string;
}
