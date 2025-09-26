import {
  Controller,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@ApiTags('Admin - Data Fixes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/fix')
export class FixUserDataController {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  @Post('user/:id/email')
  @ApiOperation({ summary: 'Fix corrupted user email field (Admin)' })
  @ApiResponse({ status: 200, description: 'User email fixed successfully' })
  async fixUserEmail(@Param('id') userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Check if email field contains JSON (corrupted)
    let originalEmail = user.email;
    let isCorrupted = false;
    
    try {
      // If email field can be parsed as JSON, it's corrupted
      JSON.parse(user.email);
      isCorrupted = true;
    } catch {
      // Email field is a normal string, not corrupted
      isCorrupted = false;
    }

    if (!isCorrupted) {
      return { 
        success: true, 
        message: 'Email field is not corrupted',
        currentEmail: user.email 
      };
    }

    // Extract email preferences from corrupted email field
    let emailPreferences: any = {};
    try {
      emailPreferences = JSON.parse(user.email);
    } catch (error) {
      return { success: false, message: 'Could not parse corrupted email data' };
    }

    // Fix the email field based on user role and existing data
    let correctEmail = 'admin@agentportal.com'; // Default for admin
    
    if (user.role === 'admin') {
      correctEmail = 'admin@agentportal.com';
    } else if (user.role === 'pt_admin') {
      correctEmail = 'ptadmin@agentportal.com';
    }

    // Update user with correct email and move preferences to metadata
    const currentMetadata = user.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      emailPreferences,
      // Extract individual flags for compatibility
      earningsNotifications: emailPreferences.earnings,
      payoutNotifications: emailPreferences.payouts,
      trainingNotifications: emailPreferences.training,
      systemNotifications: emailPreferences.system,
      marketingNotifications: emailPreferences.marketing,
    };

    await this.usersRepository.update(userId, {
      email: correctEmail,
      metadata: updatedMetadata,
    });

    return {
      success: true,
      message: 'User email field fixed successfully',
      changes: {
        oldEmail: originalEmail,
        newEmail: correctEmail,
        extractedPreferences: emailPreferences,
        metadataUpdated: true,
      },
    };
  }

  @Post('user/:id/verify-data')
  @ApiOperation({ summary: 'Verify and report user data integrity (Admin)' })
  @ApiResponse({ status: 200, description: 'User data integrity report' })
  async verifyUserData(@Param('id') userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const report = {
      userId: user.id,
      email: {
        value: user.email,
        isValid: this.isValidEmail(user.email),
        isCorrupted: this.isJsonString(user.email),
      },
      metadata: {
        exists: !!user.metadata,
        keys: user.metadata ? Object.keys(user.metadata) : [],
      },
      recommendations: [],
    };

    if (report.email.isCorrupted) {
      report.recommendations.push('Fix corrupted email field using /admin/fix/user/:id/email');
    }

    return report;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isJsonString(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
}
