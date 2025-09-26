import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2FADto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'admin@agentportal.com' 
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: '6-digit verification code from authenticator app',
    example: '123456' 
  })
  @IsString()
  code: string;
}

export class Setup2FADto {
  @ApiProperty({ 
    description: '6-digit verification code to confirm 2FA setup',
    example: '123456' 
  })
  @IsString()
  verificationCode: string;
}

export class Disable2FADto {
  @ApiProperty({ 
    description: '6-digit verification code to disable 2FA',
    example: '123456' 
  })
  @IsString()
  verificationCode: string;

  @ApiProperty({ 
    description: 'Current password for additional security',
    example: 'currentPassword123' 
  })
  @IsString()
  currentPassword: string;
}
