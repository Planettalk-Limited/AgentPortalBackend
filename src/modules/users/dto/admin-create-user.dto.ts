import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class AdminCreateUserDto {
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
    example: 'ZW',
    minLength: 2,
    maxLength: 2
  })
  @IsString()
  @Length(2, 2, { message: 'Country must be a 2-character ISO country code' })
  country: string;

  @ApiProperty({ description: 'Username (unique)', example: 'johndoe' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({ description: 'Email address (unique)', example: 'john.doe@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Password (will be hashed)', example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'User role - defaults to ADMIN for this endpoint',
    enum: UserRole,
    default: UserRole.ADMIN,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Phone number', example: '+263771234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;
}

