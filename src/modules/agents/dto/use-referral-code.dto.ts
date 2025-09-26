import {
  IsString,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UseReferralCodeDto {
  @ApiProperty({ 
    description: 'Full name of the customer who will be topping up',
    example: 'John Smith'
  })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ 
    description: 'Phone number that will be used for airtime top-ups (with country code)',
    example: '+234803456789'
  })
  @IsString()
  @MaxLength(20)
  phoneNumber: string;
}
