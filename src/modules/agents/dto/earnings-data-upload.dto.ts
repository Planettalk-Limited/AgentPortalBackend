import {
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgentEarningsDataDto {
  @ApiProperty({ 
    description: 'Agent code to identify the agent',
    example: 'AG123456'
  })
  @IsString()
  @MaxLength(20)
  agentCode: string;

  @ApiProperty({ 
    description: 'Total earnings (all time)',
    example: 1250.50,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalEarnings: number;

  @ApiProperty({ 
    description: 'Earnings for current month',
    example: 150.75,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  earningsForCurrentMonth: number;

  @ApiProperty({ 
    description: 'Total referrals (all time)',
    example: 45,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  totalReferrals: number;

  @ApiProperty({ 
    description: 'Referrals for current month',
    example: 5,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  referralsForCurrentMonth: number;

  @ApiProperty({ 
    description: 'Available balance for payout',
    example: 1100.50,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  availableBalance: number;

  @ApiProperty({ 
    description: 'Total payout amount (all time)',
    example: 950.00,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalPayoutAmount: number;

  @ApiPropertyOptional({ 
    description: 'Month for which this data applies (YYYY-MM format)',
    example: '2025-10'
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  availableMonth?: string;
}

export class BulkEarningsDataUploadDto {
  @ApiProperty({
    description: 'Array of agent earnings data to upload',
    type: [AgentEarningsDataDto],
    minItems: 1
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one agent earnings data entry is required' })
  @ValidateNested({ each: true })
  @Type(() => AgentEarningsDataDto)
  agentsData: AgentEarningsDataDto[];

  @ApiPropertyOptional({ 
    description: 'Batch description for tracking purposes',
    example: 'Monthly earnings data upload - October 2025'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  batchDescription?: string;

  @ApiPropertyOptional({ 
    description: 'Whether to update agent balances immediately',
    default: true
  })
  @IsOptional()
  autoUpdate?: boolean;

  @ApiPropertyOptional({ 
    description: 'Additional metadata for the batch upload',
    example: { uploadSource: 'PlanetTalk System', batchId: 'BATCH-2025-10' }
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkEarningsDataUploadResultDto {
  @ApiProperty({ description: 'Total number of agent records processed' })
  totalProcessed: number;

  @ApiProperty({ description: 'Number of successful updates' })
  successful: number;

  @ApiProperty({ description: 'Number of failed updates' })
  failed: number;

  @ApiProperty({ description: 'Detailed results for each agent' })
  details: {
    agentCode: string;
    status: 'success' | 'error' | 'warning';
    message: string;
    error?: string;
    updatedFields?: string[];
  }[];

  @ApiProperty({ description: 'Batch identifier for tracking' })
  batchId?: string;

  @ApiProperty({ description: 'Timestamp of the upload' })
  uploadedAt: Date;
}

