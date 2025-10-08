import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateResourceDto } from './create-resource.dto';

export class UpdateResourceDto extends PartialType(CreateResourceDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResourceQueryDto {
  @IsOptional()
  category?: string;

  @IsOptional()
  type?: string;

  @IsOptional()
  visibility?: string;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  isFeatured?: boolean;

  @IsOptional()
  search?: string;

  @IsOptional()
  tags?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
