import { IsEmail, IsString, IsOptional, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus } from '../entities/agent.entity';

export class CreateAgentDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123 Main St', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'New York', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'NY', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: '10001', required: false })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ example: 'USA', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ enum: AgentStatus, example: AgentStatus.PENDING_APPLICATION, required: false })
  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;

  @ApiProperty({ example: 5.5, required: false })
  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @ApiProperty({ example: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'uuid-string', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
