import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsDateString,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType, ResourceCategory, ResourceVisibility } from '../entities/resource.entity';

export class CreateResourceDto {
  @ApiProperty({ 
    description: 'Resource title',
    example: 'Agent Training Manual v2.1'
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ 
    description: 'Resource description',
    example: 'Comprehensive training manual for new agents covering commission structure, customer service, and platform usage.'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Resource type',
    enum: ResourceType,
    example: ResourceType.DOCUMENT
  })
  @IsEnum(ResourceType)
  type: ResourceType;

  @ApiProperty({
    description: 'Resource category',
    enum: ResourceCategory,
    example: ResourceCategory.TRAINING
  })
  @IsEnum(ResourceCategory)
  category: ResourceCategory;

  @ApiProperty({
    description: 'Resource visibility',
    enum: ResourceVisibility,
    default: ResourceVisibility.PUBLIC
  })
  @IsEnum(ResourceVisibility)
  visibility: ResourceVisibility;

  @ApiPropertyOptional({ 
    description: 'Whether resource is featured',
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ 
    description: 'Publication date (ISO string)',
    example: '2025-01-15T10:30:00Z'
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional({ 
    description: 'Expiration date (ISO string)',
    example: '2025-12-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ 
    description: 'Resource tags',
    example: ['training', 'manual', 'new-agent']
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map(tag => tag.trim());
      }
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'External URL for externally hosted content (videos, etc.)',
    example: 'https://youtube.com/watch?v=training-video'
  })
  @IsOptional()
  @IsString()
  externalUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Embedded text content for display inline',
    example: 'This is the content that will be displayed directly in the portal...'
  })
  @IsOptional()
  @IsString()
  embeddedContent?: string;

  @ApiPropertyOptional({ 
    description: 'Whether content is embedded (true) or file/external (false)',
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isEmbedded?: boolean;

  @ApiPropertyOptional({ 
    description: 'Whether content is hosted externally (true) or uploaded (false)',
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isExternal?: boolean;

  @ApiPropertyOptional({ 
    description: 'Additional metadata',
    example: { version: '2.1', author: 'Training Team', language: 'en' }
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value || {};
  })
  @IsObject()
  metadata?: Record<string, any>;
}
