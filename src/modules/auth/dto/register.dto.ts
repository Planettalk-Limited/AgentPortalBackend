import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Length,
  Matches,
  IsEnum,
  IsNotEmpty,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PartnerRegistrationType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
}

export enum BusinessActivity {
  GROCERY_CONVENIENCE = 'grocery_convenience',
  RESTAURANT_CAFE = 'restaurant_cafe',
  BAR_PUB = 'bar_pub',
  SPECIALTY_FOOD_IMPORT = 'specialty_food_import',
  PROFESSIONAL_SERVICES = 'professional_services',
  OTHER = 'other',
}

export enum CustomerInteractionType {
  SIT_DOWN_TABLE_SERVICE = 'sit_down_table_service',
  GRAB_AND_GO = 'grab_and_go',
  APPOINTMENT_BASED = 'appointment_based',
}

export class RegisterDto {
  @ApiProperty({ description: 'First name of the user', example: 'John' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Doe' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Country (ISO 3166-1 alpha-2 code)',
    example: 'US',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2, { message: 'Country must be a 2-character ISO country code' })
  country: string;

  @ApiProperty({
    description: 'Phone number with country code',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Phone number must start with + followed by country code and 7-15 digits (e.g., +1234567890)',
  })
  phoneNumber?: string;

  @ApiProperty({ description: 'Email address (unique)', example: 'john.doe@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Password', example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Registration channel; omit or "individual" for standard partner signup',
    enum: PartnerRegistrationType,
    default: PartnerRegistrationType.INDIVIDUAL,
  })
  @IsOptional()
  @IsEnum(PartnerRegistrationType)
  partnerType?: PartnerRegistrationType;

  // ── Business-specific fields ───────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Legal or trading company name (required for business)',
    example: 'Afro Foods Ltd',
  })
  @ValidateIf((o: RegisterDto) => o.partnerType === PartnerRegistrationType.BUSINESS)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Full business address including post code (required for business)',
    example: '42 High Street, Manchester, M1 2AB',
  })
  @ValidateIf((o: RegisterDto) => o.partnerType === PartnerRegistrationType.BUSINESS)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  businessAddress?: string;

  @ApiPropertyOptional({
    description: 'Primary business activity',
    enum: BusinessActivity,
    example: BusinessActivity.GROCERY_CONVENIENCE,
  })
  @ValidateIf((o: RegisterDto) => o.partnerType === PartnerRegistrationType.BUSINESS)
  @IsEnum(BusinessActivity)
  primaryBusinessActivity?: BusinessActivity;

  @ApiPropertyOptional({
    description: 'Primary cuisine or product specialty (e.g. African, Caribbean, South Asian)',
    example: 'African',
  })
  @ValidateIf((o: RegisterDto) => o.partnerType === PartnerRegistrationType.BUSINESS)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  primarySpecialty?: string;

  @ApiPropertyOptional({
    description: 'How customers typically interact with the business',
    enum: CustomerInteractionType,
    example: CustomerInteractionType.GRAB_AND_GO,
  })
  @ValidateIf((o: RegisterDto) => o.partnerType === PartnerRegistrationType.BUSINESS)
  @IsEnum(CustomerInteractionType)
  customerInteractionType?: CustomerInteractionType;

  @ApiPropertyOptional({
    description: 'Does the business currently sell international food, specialty imports, or ethnic goods?',
    example: true,
  })
  @ValidateIf((o: RegisterDto) => o.partnerType === PartnerRegistrationType.BUSINESS)
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
  })
  @IsBoolean()
  sellsInternationalGoods?: boolean;

  // ── Legacy / optional business fields (kept for backwards compatibility) ──

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
