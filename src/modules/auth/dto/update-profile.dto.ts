import { IsString, IsOptional, IsEmail, IsPhoneNumber, MaxLength, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ 
    description: 'Country (ISO 3166-1 alpha-2 code)', 
    example: 'US',
    minLength: 2,
    maxLength: 2
  })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country must be a 2-character ISO country code' })
  country?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;
}
