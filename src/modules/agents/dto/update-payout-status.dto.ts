import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutStatus } from '../entities/payout.entity';

export class UpdatePayoutStatusDto {
  @ApiProperty({
    description: 'New payout status',
    enum: PayoutStatus,
  })
  @IsEnum(PayoutStatus)
  status: PayoutStatus;

  @ApiPropertyOptional({ description: 'Admin notes about the status change' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNotes?: string;

  @ApiPropertyOptional({ description: 'Rejection reason (required if status is rejected)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Transaction ID from payment processor' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Processing fees' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  fees?: number;
}
