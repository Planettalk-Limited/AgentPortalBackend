import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Length,
  IsPhoneNumber,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'First name of the user', example: 'John' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Doe' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ 
    description: 'Country (ISO 3166-1 alpha-2 code)', 
    example: 'US',
    minLength: 2,
    maxLength: 2
  })
  @IsString()
  @Length(2, 2, { message: 'Country must be a 2-character ISO country code' })
  country: string;

  @ApiProperty({ 
    description: 'Phone number with country code', 
    example: '+1234567890'
  })
  @Matches(/^\+[1-9]\d{1,14}$/, { 
    message: 'Phone number must start with + followed by country code and 7-15 digits (e.g., +1234567890)' 
  })
  phoneNumber: string;

  @ApiProperty({ description: 'Email address (unique)', example: 'john.doe@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Password', example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;
}
