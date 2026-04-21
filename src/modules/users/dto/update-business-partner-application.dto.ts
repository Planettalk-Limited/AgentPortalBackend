import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessActivity,
  CustomerInteractionType,
} from '../../auth/dto/register.dto';

export class UpdateBusinessPartnerApplicationDto {
  @ApiPropertyOptional({ description: 'Applicant first name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Applicant last name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Country (ISO 3166-1 alpha-2 code)',
    example: 'GB',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country must be a 2-character ISO country code' })
  country?: string;

  @ApiPropertyOptional({
    description: 'Phone number with country code',
    example: '+441234567890',
  })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Phone number must start with + followed by country code and 7-15 digits (e.g., +1234567890)',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Legal or trading company name',
    example: 'Afro Foods Ltd',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Full business address including post code',
    example: '42 High Street, Manchester, M1 2AB',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  businessAddress?: string;

  @ApiPropertyOptional({
    description: 'Primary business activity',
    enum: BusinessActivity,
  })
  @IsOptional()
  @IsEnum(BusinessActivity)
  primaryBusinessActivity?: BusinessActivity;

  @ApiPropertyOptional({
    description: 'Primary cuisine or product specialty',
    example: 'African',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  primarySpecialty?: string;

  @ApiPropertyOptional({
    description: 'How customers typically interact with the business',
    enum: CustomerInteractionType,
  })
  @IsOptional()
  @IsEnum(CustomerInteractionType)
  customerInteractionType?: CustomerInteractionType;

  @ApiPropertyOptional({
    description:
      'Whether the business currently sells international food or specialty imports',
  })
  @IsOptional()
  @IsBoolean()
  sellsInternationalGoods?: boolean;

  @ApiPropertyOptional({ description: 'Expected partnership volume' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  expectedVolume?: string;

  @ApiPropertyOptional({ description: 'Region or territory' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  region?: string;

  @ApiPropertyOptional({ description: 'Company registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyRegistrationNumber?: string;
}
