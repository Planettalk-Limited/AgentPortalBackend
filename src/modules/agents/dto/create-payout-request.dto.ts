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
    minimum: 3,
    maximum: 100000 
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(3, { message: 'Minimum payout amount is $3' })
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
      accountNumber: string;
      routingNumber: string;
      accountName: string;
      bankName: string;
    };
    paypal?: {
      email: string;
    };
    crypto?: {
      address: string;
      network: string;
    };
    airtimeTopup?: {
      phoneNumber: string;
      accountName?: string;
    };
    mobileMoney?: {
      phoneNumber: string;
      provider: string; // EcoCash, M-Pesa, Orange Money, etc.
      accountName: string;
      country: string;
    };
    other?: Record<string, any>;
  };

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
