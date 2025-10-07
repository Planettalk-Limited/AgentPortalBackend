import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TwoFactorService } from './two-factor.service';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private twoFactorService: TwoFactorService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if this is a first login for a pending user
    const isFirstLoginPendingUser = user.isFirstLogin && user.status === 'pending';
    let approvalData = null;

    if (isFirstLoginPendingUser) {
      // Auto-approve the user on first successful login
      try {
        approvalData = await this.usersService.approveUserOnFirstLogin(user.id);
        console.log(`Auto-approved user ${user.email} on first login`);
      } catch (error) {
        console.error('Failed to auto-approve user on first login:', error);
        // Continue with normal login even if approval fails
      }
    }

    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const baseResponse = {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        country: user.country,
        role: user.role,
        status: approvalData?.user?.status || user.status,
        isFirstLogin: false, // Reset after successful login
      },
    };

    // If this was a first login approval, include the referral data
    if (approvalData) {
      return {
        ...baseResponse,
        firstLoginApproval: true,
        message: approvalData.message,
        referralData: {
          valid: approvalData.valid,
          agent: approvalData.agent,
          program: approvalData.program,
          personalizedMessage: approvalData.personalizedMessage,
          codeDetails: approvalData.codeDetails,
          callToAction: approvalData.callToAction,
        },
      };
    }

    return baseResponse;
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async logout(user: any): Promise<{ success: boolean; message: string }> {
    // In a more sophisticated implementation, you might:
    // 1. Blacklist the JWT token
    // 2. Clear refresh tokens
    // 3. Log the logout event
    
    // For now, we'll just return success since JWT tokens are stateless
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.usersService.findByIdWithRelations(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash, ...profile } = user;
    
    // If user is an agent, include agent-specific data
    if (user.role === 'agent' && user.agents && user.agents.length > 0) {
      const agent = user.agents[0]; // Get the primary agent record
      
      return {
        ...profile,
        fullName: `${user.firstName} ${user.lastName}`,
        agent: {
          id: agent.id,
          agentCode: agent.agentCode,
          status: agent.status,
          tier: agent.tier,
          totalEarnings: agent.totalEarnings,
          availableBalance: agent.availableBalance,
          pendingBalance: agent.pendingBalance,
          totalReferrals: agent.totalReferrals,
          activeReferrals: agent.activeReferrals,
          commissionRate: agent.commissionRate,
          activatedAt: agent.activatedAt,
          lastActivityAt: agent.lastActivityAt,
          notes: agent.notes,
        },
        preferences: {
          emailNotifications: profile.metadata?.emailNotifications ?? true,
          smsNotifications: profile.metadata?.smsNotifications ?? false,
          language: profile.metadata?.language ?? 'en',
          timezone: profile.metadata?.timezone ?? 'UTC',
          currency: profile.metadata?.currency ?? 'USD',
        },
        settings: {
          twoFactorEnabled: profile.metadata?.twoFactorEnabled ?? false,
          requirePasswordChange: profile.metadata?.requirePasswordChange ?? false,
          lastPasswordChange: profile.metadata?.lastPasswordChange,
          loginNotifications: profile.metadata?.loginNotifications ?? true,
        },
        profile: {
          bio: profile.metadata?.bio,
          avatar: profile.metadata?.avatar,
          socialLinks: profile.metadata?.socialLinks ?? {},
          emergencyContact: profile.metadata?.emergencyContact,
        },
      };
    }

    // For non-agent users (admin, pt_admin)
    return {
      ...profile,
      fullName: `${user.firstName} ${user.lastName}`,
      preferences: {
        emailNotifications: profile.metadata?.emailNotifications ?? true,
        smsNotifications: profile.metadata?.smsNotifications ?? false,
        language: profile.metadata?.language ?? 'en',
        timezone: profile.metadata?.timezone ?? 'UTC',
        currency: profile.metadata?.currency ?? 'USD',
      },
      settings: {
        twoFactorEnabled: profile.metadata?.twoFactorEnabled ?? false,
        requirePasswordChange: profile.metadata?.requirePasswordChange ?? false,
        lastPasswordChange: profile.metadata?.lastPasswordChange,
        loginNotifications: profile.metadata?.loginNotifications ?? true,
      },
      adminSettings: user.role === 'admin' || user.role === 'pt_admin' ? {
        department: profile.metadata?.department,
        permissions: profile.metadata?.permissions ?? [],
        lastAdminAction: profile.metadata?.lastAdminAction,
      } : undefined,
    };
  }

  async updateProfile(userId: string, updateData: any): Promise<any> {
    const user = await this.usersService.findByIdWithRelations(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Separate basic fields from metadata fields
    const { 
      firstName, 
      lastName, 
      email, 
      phoneNumber,
      bio,
      avatar,
      emailNotifications,
      smsNotifications,
      language,
      timezone,
      currency,
      twoFactorEnabled,
      loginNotifications,
      socialLinks,
      emergencyContact,
      department,
      // Nested notification preferences
      email: emailPreferences,
      sms: smsPreferences, 
      push: pushPreferences,
      specificNotifications,
      ...otherFields 
    } = updateData;

    // Prepare basic user updates
    const basicUpdates: any = {};
    if (firstName !== undefined) basicUpdates.firstName = firstName;
    if (lastName !== undefined) basicUpdates.lastName = lastName;
    // Only update email if it's a string (actual email), not an object (email preferences)
    if (email !== undefined && typeof email === 'string') basicUpdates.email = email;
    if (phoneNumber !== undefined) basicUpdates.phoneNumber = phoneNumber;

    // Prepare metadata updates
    const currentMetadata = user.metadata || {};
    const metadataUpdates = {
      ...currentMetadata,
    };

    if (bio !== undefined) metadataUpdates.bio = bio;
    if (avatar !== undefined) metadataUpdates.avatar = avatar;
    if (emailNotifications !== undefined) metadataUpdates.emailNotifications = emailNotifications;
    if (smsNotifications !== undefined) metadataUpdates.smsNotifications = smsNotifications;
    if (language !== undefined) metadataUpdates.language = language;
    if (timezone !== undefined) metadataUpdates.timezone = timezone;
    if (currency !== undefined) metadataUpdates.currency = currency;
    if (twoFactorEnabled !== undefined) metadataUpdates.twoFactorEnabled = twoFactorEnabled;
    if (loginNotifications !== undefined) metadataUpdates.loginNotifications = loginNotifications;
    if (socialLinks !== undefined) metadataUpdates.socialLinks = socialLinks;
    if (emergencyContact !== undefined) metadataUpdates.emergencyContact = emergencyContact;
    
    // Handle nested notification preferences
    if (emailPreferences !== undefined) {
      metadataUpdates.emailPreferences = emailPreferences;
      // Also update individual email preference flags for backward compatibility
      if (emailPreferences.earnings !== undefined) metadataUpdates.earningsNotifications = emailPreferences.earnings;
      if (emailPreferences.payouts !== undefined) metadataUpdates.payoutNotifications = emailPreferences.payouts;
      if (emailPreferences.training !== undefined) metadataUpdates.trainingNotifications = emailPreferences.training;
      if (emailPreferences.system !== undefined) metadataUpdates.systemNotifications = emailPreferences.system;
      if (emailPreferences.marketing !== undefined) metadataUpdates.marketingNotifications = emailPreferences.marketing;
    }

    if (smsPreferences !== undefined) {
      metadataUpdates.smsPreferences = smsPreferences;
    }

    if (pushPreferences !== undefined) {
      metadataUpdates.pushPreferences = pushPreferences;
    }

    if (specificNotifications !== undefined) {
      // Merge specific notifications into metadata
      Object.assign(metadataUpdates, specificNotifications);
    }
    
    // Admin-specific fields
    if ((user.role === 'admin' || user.role === 'pt_admin') && department !== undefined) {
      metadataUpdates.department = department;
    }

    // Update user with both basic fields and metadata
    const updatedUser = await this.usersService.update(userId, {
      ...basicUpdates,
      metadata: metadataUpdates,
    });

    // Return the comprehensive profile
    return this.getProfile(userId);
  }

  async changePassword(
    userId: string,
    passwordData: { currentPassword: string; newPassword: string }
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(passwordData.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '10'));
    const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, saltRounds);

    // Update password
    await this.usersService.update(userId, { passwordHash: hashedNewPassword });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    // Save reset token to user (you'll need to add these fields to User entity)
    await this.usersService.update(user.id, {
      metadata: {
        ...user.metadata,
        resetToken,
        resetTokenExpiry: resetTokenExpiry.toISOString(),
      },
    });

    // Send password reset email via Mailgun
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/en/reset-password?token=${resetToken}`;
    const has2FA = user.metadata?.twoFactorEnabled === true;
    
    try {
      const emailSent = await this.emailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetToken,
        resetUrl,
        has2FA
      );

      if (emailSent) {
        return {
          success: true,
          message: 'Password reset email sent successfully via Mailgun',
          // Only include token in development mode
          ...(process.env.NODE_ENV === 'development' && { resetToken }),
        };
      } else {
        return {
          success: false,
          message: 'Failed to send password reset email. Please try again.',
        };
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return {
        success: false,
        message: 'Failed to send password reset email. Please contact support.',
      };
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Find user by reset token
    const users = await this.usersService.findAll();
    const user = users.find(u => 
      u.metadata?.resetToken === token && 
      u.metadata?.resetTokenExpiry && 
      new Date(u.metadata.resetTokenExpiry) > new Date()
    );

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '10'));
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await this.usersService.update(user.id, {
      passwordHash: hashedNewPassword,
      metadata: {
        ...user.metadata,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async login2FA(verify2FADto: Verify2FADto): Promise<any> {
    // First, validate user credentials again for security
    const user = await this.usersService.findByEmail(verify2FADto.email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.metadata?.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    // Verify 2FA code
    const verified = this.twoFactorService.verify2FACode(
      user.metadata.twoFactorSecret,
      verify2FADto.code
    );

    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA verification code');
    }

    // Generate JWT token after successful 2FA verification
    const payload: JwtPayload = { 
      email: user.email, 
      sub: user.id,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    // Update last login
    await this.usersService.update(user.id, {
      lastLoginAt: new Date(),
      isFirstLogin: false,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      message: '2FA verification successful - Login complete',
    };
  }

  async sendOTPEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 minutes expiry

      // Save OTP to user metadata
      await this.usersService.update(user.id, {
        metadata: {
          ...user.metadata,
          loginOTP: otp,
          loginOTPExpiry: otpExpiry.toISOString(),
        },
      });

      // Send OTP email
      const emailSent = await this.emailService.sendOTPEmail(
        user.email,
        user.firstName,
        otp
      );

      return {
        success: emailSent,
        message: emailSent 
          ? 'OTP sent successfully to your email'
          : 'Failed to send OTP email',
      };
    } catch (error) {
      console.error('Error sending OTP email:', error);
      return { success: false, message: 'Failed to send OTP' };
    }
  }

  async verifyOTP(email: string, otp: string): Promise<{ success: boolean; message: string; access_token?: string; user?: any }> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const storedOTP = user.metadata?.loginOTP;
      const otpExpiry = user.metadata?.loginOTPExpiry;

      if (!storedOTP || !otpExpiry) {
        return { success: false, message: 'No OTP found. Please request a new one.' };
      }

      // Check if OTP expired
      if (new Date() > new Date(otpExpiry)) {
        return { success: false, message: 'OTP expired. Please request a new one.' };
      }

      // Verify OTP
      if (storedOTP !== otp) {
        return { success: false, message: 'Invalid OTP code' };
      }

      // Clear OTP from metadata
      await this.usersService.update(user.id, {
        metadata: {
          ...user.metadata,
          loginOTP: null,
          loginOTPExpiry: null,
        },
        lastLoginAt: new Date(),
        isFirstLogin: false,
      });

      // Generate JWT token
      const payload: JwtPayload = { 
        email: user.email, 
        sub: user.id,
        role: user.role,
      };

      const token = this.jwtService.sign(payload);

      return {
        success: true,
        message: 'Login successful',
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, message: 'OTP verification failed' };
    }
  }
}
