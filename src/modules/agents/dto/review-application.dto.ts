import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '../entities/agent-application.entity';

export class ReviewApplicationDto {
  @ApiProperty({ 
    description: 'New status for the application',
    enum: ApplicationStatus 
  })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiPropertyOptional({ description: 'Review notes' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional({ description: 'Rejection reason (required if status is rejected)' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
