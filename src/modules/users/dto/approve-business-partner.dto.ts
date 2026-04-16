import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ApproveBusinessPartnerDto {
  @ApiProperty({
    description:
      'Custom partner code assigned by admin (alphanumeric, may include _-) — not auto-generated',
    example: 'ACME_GLOBAL',
    minLength: 3,
    maxLength: 40,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, {
    message:
      'partnerCode must start with alphanumeric and contain only letters, numbers, underscores, or hyphens',
  })
  partnerCode: string;
}
