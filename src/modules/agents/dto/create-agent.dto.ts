import { IsEmail, IsString, IsOptional, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus } from '../entities/agent.entity';

export class CreateAgentDto {
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email address (will create user if userId not provided)', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number', example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Street address', example: '123 Main St', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'City', example: 'New York', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'State/Province', example: 'NY', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'ZIP/Postal code', example: '10001', required: false })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ description: 'Country (2-letter ISO code)', example: 'US', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ 
    description: 'Initial agent status', 
    enum: AgentStatus, 
    example: AgentStatus.PENDING_APPLICATION, 
    required: false 
  })
  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;

  @ApiProperty({ 
    description: 'Commission rate percentage (0-100)', 
    example: 15.0, 
    required: false 
  })
  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @ApiProperty({ description: 'Admin notes about the agent', example: 'New agent onboarding', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ 
    description: 'Existing user ID to link (optional - will create user if not provided)', 
    example: 'uuid-string', 
    required: false 
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
