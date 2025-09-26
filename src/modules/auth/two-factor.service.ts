import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { UsersService } from '../users/users.service';

@Injectable()
export class TwoFactorService {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async generateSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string; manualEntryKey: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const appName = this.configService.get('APP_NAME') || 'Agent Portal';
    const issuer = this.configService.get('APP_ISSUER') || 'Agent Portal';

    const secret = speakeasy.generateSecret({
      name: `${appName} (${user.email})`,
      issuer: issuer,
      length: 32,
    });

    // Generate QR code data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Store the secret temporarily in user metadata (not enabled until verified)
    const currentMetadata = user.metadata || {};
    await this.usersService.update(userId, {
      metadata: {
        ...currentMetadata,
        tempTwoFactorSecret: secret.base32,
        twoFactorSetupStarted: new Date().toISOString(),
      }
    });

    return {
      secret: secret.base32!,
      qrCodeUrl,
      manualEntryKey: secret.base32!,
    };
  }

  async verifyAndEnable2FA(userId: string, verificationCode: string): Promise<{ success: boolean; backupCodes: string[] }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const tempSecret = user.metadata?.tempTwoFactorSecret;
    if (!tempSecret) {
      throw new BadRequestException('No 2FA setup in progress. Please start setup first.');
    }

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: verificationCode,
      window: 2, // Allow 2 time windows for clock drift
    });

    if (!verified) {
      throw new BadRequestException('Invalid verification code. Please try again.');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Enable 2FA and save the secret
    const currentMetadata = user.metadata || {};
    await this.usersService.update(userId, {
      metadata: {
        ...currentMetadata,
        twoFactorEnabled: true,
        twoFactorSecret: tempSecret,
        twoFactorBackupCodes: backupCodes,
        twoFactorEnabledAt: new Date().toISOString(),
        // Remove temporary setup data
        tempTwoFactorSecret: undefined,
        twoFactorSetupStarted: undefined,
      }
    });

    return {
      success: true,
      backupCodes,
    };
  }

  async disable2FA(userId: string, verificationCode: string, currentPassword: string): Promise<{ success: boolean }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.metadata?.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    // Verify password first
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify 2FA code
    const verified = this.verify2FACode(user.metadata.twoFactorSecret, verificationCode);
    if (!verified) {
      throw new BadRequestException('Invalid verification code');
    }

    // Disable 2FA
    const currentMetadata = user.metadata || {};
    await this.usersService.update(userId, {
      metadata: {
        ...currentMetadata,
        twoFactorEnabled: false,
        twoFactorSecret: undefined,
        twoFactorBackupCodes: undefined,
        twoFactorDisabledAt: new Date().toISOString(),
      }
    });

    return { success: true };
  }

  verify2FACode(secret: string, code: string): boolean {
    if (!secret || !code) {
      return false;
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time windows for clock drift
    });

    return verified;
  }

  verifyBackupCode(userId: string, backupCode: string): boolean {
    // This would need to check against stored backup codes
    // and mark the code as used
    return false; // Placeholder - implement based on your security requirements
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  async check2FARequired(email: string): Promise<{ required: boolean; user?: any }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const twoFactorEnabled = user.metadata?.twoFactorEnabled === true;
    
    return {
      required: twoFactorEnabled,
      user: twoFactorEnabled ? {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        role: user.role,
      } : undefined,
    };
  }
}
