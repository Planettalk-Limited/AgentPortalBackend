import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  IsObject,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutMethod } from '../entities/payout.entity';

export class CreatePayoutRequestDto {
  @ApiProperty({ 
    description: 'Amount to request for payout',
    minimum: 20,
    maximum: 100000 
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(20, { message: 'Minimum payout amount is $20' })
  @Max(100000, { message: 'Maximum payout amount is $100,000' })
  amount: number;

  @ApiProperty({
    description: 'Payout method',
    enum: PayoutMethod,
    default: PayoutMethod.BANK_TRANSFER,
  })
  @IsEnum(PayoutMethod)
  method: PayoutMethod;

  @ApiPropertyOptional({ description: 'Description or notes for the payout' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Payment details based on method' })
  @IsObject()
  paymentDetails: {
    bankAccount?: {
      bankName: string;
      branchNameOrCode?: string;
      accountName: string;
      accountNumberOrIban: string;
      swiftBicCode?: string;
      currency: string;
      bankCountry: string;
      additionalNotes?: string;
    };
    planettalkCredit?: {
      planettalkMobile: string; // PlanetTalk associated mobile number
      accountName?: string;
    };
  };

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
