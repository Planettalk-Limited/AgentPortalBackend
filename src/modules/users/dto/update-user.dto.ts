import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject, IsDate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['username'] as const)
) {
  // All fields from CreateUserDto are optional except username (which can't be changed)
  // Password is optional and will be hashed if provided
  
  @IsOptional()
  @IsString()
  passwordHash?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsDate()
  lastLoginAt?: Date;

  @IsOptional()
  isFirstLogin?: boolean;
}