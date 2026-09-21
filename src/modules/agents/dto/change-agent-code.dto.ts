import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeAgentCodeDto {
  @ApiProperty({
    description:
      'Custom partner code to assign in place of the generic PTA code. Uppercased on save.',
    example: 'AFRO_FOODS_MCR',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, {
    message:
      'Partner code must start with a letter or digit and contain only letters, digits, underscores or hyphens',
  })
  agentCode: string;
}
