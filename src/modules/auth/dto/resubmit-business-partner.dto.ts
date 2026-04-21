import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { UpdateBusinessPartnerApplicationDto } from '../../users/dto/update-business-partner-application.dto';

export class ResubmitBusinessPartnerDto extends UpdateBusinessPartnerApplicationDto {
  @ApiProperty({
    description: 'Email address for the rejected business partner account',
    example: 'owner@acmefoods.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Account password used to authenticate before resubmission',
    example: 'SecurePassword123!',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
