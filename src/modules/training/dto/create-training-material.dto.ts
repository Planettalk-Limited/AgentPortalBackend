import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsArray, IsObject, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrainingType, TrainingStatus } from '../entities/training-material.entity';

export class CreateTrainingMaterialDto {
  @ApiProperty({ description: 'Training material title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Training material description' })
  @IsString()
  description: string;

  @ApiProperty({ enum: TrainingType, description: 'Type of training material' })
  @IsEnum(TrainingType)
  type: TrainingType;

  @ApiPropertyOptional({ enum: TrainingStatus, description: 'Status of training material' })
  @IsOptional()
  @IsEnum(TrainingStatus)
  status?: TrainingStatus;

  @ApiPropertyOptional({ description: 'Training content (HTML/Markdown)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Video URL for training' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Document URL for training' })
  @IsOptional()
  @IsUrl()
  documentUrl?: string;

  @ApiPropertyOptional({ description: 'Array of attachment URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({ description: 'Whether this training is required' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ description: 'Estimated completion time in minutes' })
  @IsOptional()
  @IsInt()
  estimatedMinutes?: number;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Comma-separated prerequisite training IDs' })
  @IsOptional()
  @IsString()
  prerequisiteIds?: string;
}

export class UpdateTrainingMaterialDto {
  @ApiPropertyOptional({ description: 'Training material title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Training material description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TrainingType, description: 'Type of training material' })
  @IsOptional()
  @IsEnum(TrainingType)
  type?: TrainingType;

  @ApiPropertyOptional({ enum: TrainingStatus, description: 'Status of training material' })
  @IsOptional()
  @IsEnum(TrainingStatus)
  status?: TrainingStatus;

  @ApiPropertyOptional({ description: 'Training content (HTML/Markdown)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Video URL for training' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Document URL for training' })
  @IsOptional()
  @IsUrl()
  documentUrl?: string;

  @ApiPropertyOptional({ description: 'Array of attachment URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({ description: 'Whether this training is required' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ description: 'Estimated completion time in minutes' })
  @IsOptional()
  @IsInt()
  estimatedMinutes?: number;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Comma-separated prerequisite training IDs' })
  @IsOptional()
  @IsString()
  prerequisiteIds?: string;
}

export class CompleteTrainingDto {
  @ApiPropertyOptional({ description: 'Time spent on training in minutes' })
  @IsOptional()
  @IsInt()
  timeSpentMinutes?: number;

  @ApiPropertyOptional({ description: 'Score achieved (0-100)' })
  @IsOptional()
  @IsInt()
  score?: number;

  @ApiPropertyOptional({ description: 'Notes from completion' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
