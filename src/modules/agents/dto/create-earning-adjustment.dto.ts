import {
  IsNumber,
  IsEnum,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AdjustmentType {
  BONUS = 'bonus',
  PENALTY = 'penalty',
  CORRECTION = 'correction',
  REFUND = 'refund',
  FEE = 'fee',
  OTHER = 'other',
}

export class CreateEarningAdjustmentDto {
  @ApiProperty({ 
    description: 'Adjustment amount (positive for credits, negative for debits)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;

  @ApiProperty({
    description: 'Type of adjustment',
    enum: AdjustmentType,
  })
  @IsEnum(AdjustmentType)
  type: AdjustmentType;

  @ApiProperty({ description: 'Reason for the adjustment' })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Reference ID (e.g., related payout, commission, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;
}
