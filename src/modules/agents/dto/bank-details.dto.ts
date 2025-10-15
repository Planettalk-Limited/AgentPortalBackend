import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BankDetailsDto {
  @ApiProperty({ 
    description: 'Bank name',
    example: 'Standard Bank'
  })
  @IsString()
  @IsNotEmpty({ message: 'Bank name is required' })
  @MaxLength(200)
  bankName: string;

  @ApiPropertyOptional({ 
    description: 'Branch name or branch code',
    example: 'Main Branch / 001234'
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  branchNameOrCode?: string;

  @ApiProperty({ 
    description: 'Account name (must match Agent registration name)',
    example: 'John Doe'
  })
  @IsString()
  @IsNotEmpty({ message: 'Account name is required' })
  @MaxLength(200)
  accountName: string;

  @ApiProperty({ 
    description: 'Account number or IBAN',
    example: '1234567890 or GB29NWBK60161331926819'
  })
  @IsString()
  @IsNotEmpty({ message: 'Account number/IBAN is required' })
  @MaxLength(100)
  accountNumberOrIban: string;

  @ApiPropertyOptional({ 
    description: 'SWIFT/BIC code (for international payments)',
    example: 'SBZAZAJJ'
  })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  swiftBicCode?: string;

  @ApiProperty({ 
    description: 'Currency of account',
    example: 'GBP',
    enum: ['GBP', 'CAD', 'EUR', 'NGN', 'USD', 'ZAR', 'KES', 'GHS', 'UGX', 'TZS']
  })
  @IsString()
  @IsNotEmpty({ message: 'Account currency is required' })
  @MaxLength(3)
  currency: string;

  @ApiProperty({ 
    description: 'Bank country',
    example: 'United Kingdom'
  })
  @IsString()
  @IsNotEmpty({ message: 'Bank country is required' })
  @MaxLength(100)
  bankCountry: string;

  @ApiPropertyOptional({ 
    description: 'Additional bank details or notes',
    example: 'Savings account'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalNotes?: string;
}

export interface BankDetails {
  bankName: string;
  branchNameOrCode?: string;
  accountName: string;
  accountNumberOrIban: string;
  swiftBicCode?: string;
  currency: string;
  bankCountry: string;
  additionalNotes?: string;
  verifiedAt?: string;
  lastUpdatedAt?: string;
}

