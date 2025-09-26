import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address for password reset' })
  @IsEmail()
  email: string;
}
