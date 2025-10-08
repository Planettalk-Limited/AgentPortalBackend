import { Controller, Post, Body, UseGuards, Request, Get, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ComprehensiveUpdateProfileDto } from './dto/comprehensive-update-profile.dto';
import { UpdatePreferencesDto, UpdateSecuritySettingsDto, NotificationPreferencesDto } from './dto/update-preferences.dto';
import { Verify2FADto, Setup2FADto, Disable2FADto } from './dto/verify-2fa.dto';
import { VerifyEmailDto, ResendVerificationDto } from './dto/verify-email.dto';
import { TwoFactorService } from './two-factor.service';
import { UsersService } from '../users/users.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
    private usersService: UsersService,
  ) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ 
    summary: 'User login (Step 1 - Password)',
    description: 'Authenticate user with email and password. May require email verification or 2FA depending on user status.'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful, requires email verification, or requires 2FA',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            emailVerified: { type: 'boolean', example: true },
            access_token: { type: 'string' },
            user: { type: 'object' }
          }
        },
        {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            requiresEmailVerification: { type: 'boolean', example: true },
            emailVerified: { type: 'boolean', example: false },
            message: { type: 'string' },
            otpSent: { type: 'boolean' }
          }
        },
        {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            requires2FA: { type: 'boolean', example: true },
            message: { type: 'string' },
            otpSent: { type: 'boolean' }
          }
        }
      ]
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    // First attempt normal login
    const loginResult = await this.authService.login(loginDto);
    
    // If login requires email verification, return that response
    if ('requiresEmailVerification' in loginResult && loginResult.requiresEmailVerification) {
      return loginResult;
    }
    
    // If login was successful but user has 2FA enabled, check for 2FA requirement
    if ('success' in loginResult && loginResult.success) {
      const twoFactorCheck = await this.twoFactorService.check2FARequired(loginDto.email);
      
      if (twoFactorCheck.required) {
        // Send OTP email for 2FA
        const otpResult = await this.authService.sendOTPEmail(loginDto.email);

        return {
          success: false,
          requires2FA: true,
          emailVerified: true,
          message: 'OTP sent to your email. Please enter the 6-digit code.',
          email: loginDto.email,
          otpSent: otpResult.success,
          otpMessage: otpResult.message,
        };
      }
    }

    // Return the normal login result
    return loginResult;
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration with automatic referral setup' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully with referral data' })
  @ApiResponse({ status: 400, description: 'Registration failed' })
  async register(@Body() registerDto: RegisterDto) {
    return this.usersService.register(registerDto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'User login (Step 2 - Email OTP Verification)' })
  @ApiBody({ type: Verify2FADto })
  @ApiResponse({ status: 200, description: 'OTP verification successful, login complete' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP code' })
  async verifyOTP(@Body() verifyOTPDto: Verify2FADto) {
    return this.authService.verifyOTP(verifyOTPDto.email, verifyOTPDto.code);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req: any) {
    return this.authService.logout(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: ComprehensiveUpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req: any, @Body() updateData: ComprehensiveUpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, updateData);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile/preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({ status: 200, description: 'User preferences retrieved' })
  async getPreferences(@Request() req: any) {
    const profile = await this.authService.getProfile(req.user.id);
    return {
      preferences: profile.preferences,
      settings: profile.settings,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile/security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user security settings' })
  @ApiResponse({ status: 200, description: 'Security settings retrieved' })
  async getSecuritySettings(@Request() req: any) {
    const profile = await this.authService.getProfile(req.user.id);
    return {
      settings: profile.settings,
      adminSettings: profile.adminSettings,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile/notifications')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification preferences by type' })
  @ApiResponse({ status: 200, description: 'Notification preferences retrieved' })
  async getNotificationPreferences(@Request() req: any) {
    const profile = await this.authService.getProfile(req.user.id);
    const metadata = profile.metadata || {};
    
    return {
      emailNotifications: profile.preferences?.emailNotifications,
      smsNotifications: profile.preferences?.smsNotifications,
      loginNotifications: profile.settings?.loginNotifications,
      specificNotifications: {
        payoutNotifications: metadata.payoutNotifications !== false,
        earningsNotifications: metadata.earningsNotifications !== false,
        trainingNotifications: metadata.trainingNotifications !== false,
        announcementNotifications: metadata.announcementNotifications !== false,
        applicationNotifications: metadata.applicationNotifications !== false,
        systemNotifications: metadata.systemNotifications !== false,
      },
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile/preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user preferences only' })
  @ApiBody({ type: UpdatePreferencesDto })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(@Request() req: any, @Body() preferences: UpdatePreferencesDto) {
    return this.authService.updateProfile(req.user.id, preferences);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile/security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update security settings (2FA, etc.)' })
  @ApiBody({ type: UpdateSecuritySettingsDto })
  @ApiResponse({ status: 200, description: 'Security settings updated successfully' })
  async updateSecuritySettings(@Request() req: any, @Body() settings: UpdateSecuritySettingsDto) {
    return this.authService.updateProfile(req.user.id, settings);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile/notifications')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update notification preferences by type' })
  @ApiBody({ type: NotificationPreferencesDto })
  @ApiResponse({ status: 200, description: 'Notification preferences updated successfully' })
  async updateNotificationPreferences(@Request() req: any, @Body() notifications: NotificationPreferencesDto) {
    return this.authService.updateProfile(req.user.id, notifications);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile/toggle-2fa')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle two-factor authentication' })
  @ApiResponse({ status: 200, description: '2FA toggled successfully' })
  async toggle2FA(@Request() req: any, @Body() data: { enabled: boolean }) {
    return this.authService.updateProfile(req.user.id, { 
      twoFactorEnabled: data.enabled 
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile/toggle-email-notifications')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle email notifications on/off' })
  @ApiResponse({ status: 200, description: 'Email notifications toggled successfully' })
  async toggleEmailNotifications(@Request() req: any, @Body() data: { enabled: boolean }) {
    return this.authService.updateProfile(req.user.id, { 
      emailNotifications: data.enabled 
    });
  }

  // 2FA Management Endpoints
  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start 2FA setup - Generate QR code' })
  @ApiResponse({ status: 200, description: '2FA setup initiated, QR code generated' })
  async setup2FA(@Request() req: any) {
    return this.twoFactorService.generateSecret(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/verify-setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete 2FA setup with verification code' })
  @ApiBody({ type: Setup2FADto })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async verifySetup2FA(@Request() req: any, @Body() setup2FADto: Setup2FADto) {
    return this.twoFactorService.verifyAndEnable2FA(req.user.id, setup2FADto.verificationCode);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/disable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA with verification code and password' })
  @ApiBody({ type: Disable2FADto })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code or password' })
  async disable2FA(@Request() req: any, @Body() disable2FADto: Disable2FADto) {
    return this.twoFactorService.disable2FA(
      req.user.id,
      disable2FADto.verificationCode,
      disable2FADto.currentPassword
    );
  }

  @Post('2fa/check-required')
  @ApiOperation({ summary: 'Check if 2FA is required for email' })
  @ApiResponse({ status: 200, description: '2FA requirement status' })
  async check2FARequired(@Body() data: { email: string }) {
    return this.twoFactorService.check2FARequired(data.email);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @Request() req: any,
    @Body() passwordData: ChangePasswordDto
  ) {
    return this.authService.changePassword(req.user.id, passwordData);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    return this.authService.forgotPassword(data.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() data: ResetPasswordDto) {
    return this.authService.resetPassword(data.token, data.newPassword);
  }

  @Post('send-email-verification')
  @ApiOperation({ 
    summary: 'Send email verification code',
    description: 'Send a 6-digit OTP to the user\'s email for account verification. Used after registration.'
  })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({ status: 200, description: 'Verification code sent successfully' })
  @ApiResponse({ status: 400, description: 'Email already verified or user not found' })
  async sendEmailVerification(@Body() data: ResendVerificationDto) {
    return this.authService.sendEmailVerificationOTP(data.email);
  }

  @Post('verify-email')
  @ApiOperation({ 
    summary: 'Verify email with OTP code',
    description: 'Verify user email address using the 6-digit OTP code. This activates the user account and associated agent profile.'
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email verified successfully, account activated' })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
  async verifyEmail(@Body() data: VerifyEmailDto) {
    return this.authService.verifyEmailOTP(data.email, data.code);
  }
}
