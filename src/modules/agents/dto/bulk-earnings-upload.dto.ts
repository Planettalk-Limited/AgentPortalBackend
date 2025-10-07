import {
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EarningType } from '../entities/agent-earnings.entity';

export class EarningEntryDto {
  @ApiProperty({ 
    description: 'Agent code to identify the agent',
    example: 'AG123456'
  })
  @IsString()
  @MaxLength(20)
  agentCode: string;

  @ApiProperty({ 
    description: 'Earning amount (positive for credits)',
    example: 25.50,
    minimum: 0.01,
    maximum: 10000
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Earning amount must be at least $0.01' })
  @Max(10000, { message: 'Earning amount cannot exceed $10,000 per entry' })
  amount: number;

  @ApiProperty({
    description: 'Type of earning',
    enum: EarningType,
    default: EarningType.REFERRAL_COMMISSION
  })
  @IsEnum(EarningType)
  type: EarningType;

  @ApiProperty({ 
    description: 'Description of the earning',
    example: 'Commission for customer referral - Transaction #12345'
  })
  @IsString()
  @MaxLength(255)
  description: string;

  @ApiPropertyOptional({ 
    description: 'External reference ID (e.g., transaction ID, order ID)',
    example: 'TXN-12345-ABC'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;

  @ApiPropertyOptional({ 
    description: 'Commission rate used for this earning (percentage)',
    example: 10.5
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({ 
    description: 'Date when the earning was generated (ISO string). Defaults to current date if not provided',
    example: '2025-01-15T10:30:00Z'
  })
  @IsOptional()
  @IsDateString()
  earnedAt?: string;

  @ApiPropertyOptional({ 
    description: 'Currency code',
    example: 'USD',
    default: 'USD'
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class BulkEarningsUploadDto {
  @ApiProperty({
    description: 'Array of earning entries to upload',
    type: [EarningEntryDto],
    minItems: 1,
    maxItems: 1000
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one earning entry is required' })
  @ValidateNested({ each: true })
  @Type(() => EarningEntryDto)
  earnings: EarningEntryDto[];

  @ApiPropertyOptional({ 
    description: 'Batch description for tracking purposes',
    example: 'Monthly commission upload - January 2025'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  batchDescription?: string;

  @ApiPropertyOptional({ 
    description: 'Whether to automatically confirm earnings (true) or leave them pending for manual review (false)',
    default: false
  })
  @IsOptional()
  autoConfirm?: boolean;

  @ApiPropertyOptional({ 
    description: 'Additional metadata for the batch upload',
    example: { uploadSource: 'PlanetTalk API', batchId: 'BATCH-2025-001' }
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkEarningsUploadResultDto {
  @ApiProperty({ description: 'Total number of earnings processed' })
  totalProcessed: number;

  @ApiProperty({ description: 'Number of successfully created earnings' })
  successful: number;

  @ApiProperty({ description: 'Number of failed earnings' })
  failed: number;

  @ApiProperty({ description: 'Number of earnings skipped (duplicate reference IDs, etc.)' })
  skipped: number;

  @ApiProperty({ description: 'Total amount of earnings uploaded' })
  totalAmount: number;

  @ApiProperty({ description: 'List of agents that were updated' })
  updatedAgents: string[];

  @ApiProperty({ description: 'Detailed results for each entry' })
  details: {
    agentCode: string;
    status: 'success' | 'failed' | 'skipped';
    earningId?: string;
    amount?: number;
    error?: string;
    message?: string;
  }[];

  @ApiProperty({ description: 'Summary of errors encountered' })
  errorSummary: {
    invalidAgentCodes: string[];
    duplicateReferences: string[];
    validationErrors: string[];
    otherErrors: string[];
  };

  @ApiProperty({ description: 'Batch processing metadata' })
  batchInfo: {
    batchId: string;
    processedAt: Date;
    processingTimeMs: number;
    uploadedBy?: string;
  };
}
