import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewBusinessPartnerDto {
  @ApiPropertyOptional({
    description:
      'Optional internal note when moving a rejected application back to review',
    example: 'Applicant submitted updated compliance documents.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
