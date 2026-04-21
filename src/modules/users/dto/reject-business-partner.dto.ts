import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectBusinessPartnerDto {
  @ApiPropertyOptional({
    description: 'Reason for rejecting the business partner application',
    example: 'Business does not meet minimum eligibility criteria for our partner programme.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
