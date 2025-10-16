import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { TemplateService } from './template.service';
import { EmailService } from './email.service';

@ApiTags('Admin - Email Templates')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/email-templates')
export class AdminTemplatesController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get available email templates (Admin)' })
  @ApiResponse({ status: 200, description: 'List of available templates' })
  getAvailableTemplates() {
    return {
      templates: this.templateService.getAvailableTemplates(),
      message: 'Available email templates',
    };
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview email template with test data (Admin)' })
  @ApiResponse({ status: 200, description: 'Template preview generated' })
  @ApiResponse({ status: 400, description: 'Template not found or invalid data' })
  async previewTemplate(@Body() data: {
    templateName: string;
    templateData: Record<string, any>;
  }) {
    try {
      const html = await this.templateService.renderTemplate(data.templateName, data.templateData);
      
      return {
        success: true,
        html,
        templateName: data.templateName,
        previewedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        templateName: data.templateName,
      };
    }
  }

  @Post('test-send')
  @ApiOperation({ summary: 'Send test email using template (Admin)' })
  @ApiResponse({ status: 200, description: 'Test email sent successfully' })
  @ApiResponse({ status: 400, description: 'Failed to send test email' })
  async sendTestEmail(@Body() data: {
    templateName: string;
    templateData: Record<string, any>;
    testEmail: string;
    subject?: string;
  }) {
    try {
      const subject = data.subject || `Test Email - ${data.templateName}`;
      
      const success = await this.emailService.sendTemplateEmail(
        data.testEmail,
        subject,
        data.templateName,
        data.templateData
      );

      return {
        success,
        message: success ? 'Test email sent successfully' : 'Failed to send test email',
        templateName: data.templateName,
        sentTo: data.testEmail,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        templateName: data.templateName,
      };
    }
  }

  @Get('samples')
  @ApiOperation({ summary: 'Get sample template data for testing (Admin)' })
  @ApiResponse({ status: 200, description: 'Sample template data' })
  getSampleTemplateData() {
    return {
      'agent-application-acknowledgment': {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+1-555-123-4567',
        applicationId: 'APP-2024-001',
        submittedDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      },
      'agent-credentials': {
        firstName: 'John',
        agentCode: 'AGT12345',
        temporaryPassword: 'TempPass123',
        loginUrl: 'https://portal.example.com/login',
        commissionRate: 12,
        agentTier: 'Silver',
        minimumPayout: 100,
        payoutSchedule: 'Weekly',
      },
      'password-reset': {
        firstName: 'John',
        resetUrl: 'https://portal.example.com/reset-password?token=abc123',
        resetToken: 'abc123def456ghi789',
      },
      'payout-notification': {
        agentName: 'John Doe',
        payoutId: 'PO-2024-001',
        amount: 500,
        status: 'completed',
        requestedDate: '2024-01-15',
        processedDate: '2024-01-16',
        transactionId: 'TXN789012',
        fees: 5,
        netAmount: 495,
        paymentMethod: 'Bank Transfer',
        dashboardUrl: 'https://portal.example.com/dashboard',
      },
    };
  }

  @Post('clear-cache')
  @ApiOperation({ summary: 'Clear template cache (Admin)' })
  @ApiResponse({ status: 200, description: 'Template cache cleared' })
  clearTemplateCache() {
    this.templateService.clearCache();
    
    return {
      success: true,
      message: 'Template cache cleared successfully',
      clearedAt: new Date().toISOString(),
    };
  }

  @Get('validate/:templateName')
  @ApiOperation({ summary: 'Validate template exists (Admin)' })
  @ApiResponse({ status: 200, description: 'Template validation result' })
  validateTemplate(@Param('templateName') templateName: string) {
    const exists = this.templateService.templateExists(templateName);
    
    return {
      templateName,
      exists,
      message: exists ? 'Template exists' : 'Template not found',
    };
  }
}
