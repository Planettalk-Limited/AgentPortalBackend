import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../entities/user.entity';

export class CreateUserDto {
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
    description: 'User role',
    enum: UserRole,
    default: UserRole.AGENT,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'User status',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;
}