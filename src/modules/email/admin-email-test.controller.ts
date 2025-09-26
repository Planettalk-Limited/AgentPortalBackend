import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EmailService } from './email.service';

@ApiTags('Admin - Email Testing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/email')
export class AdminEmailTestController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test-send')
  @ApiOperation({ summary: 'Send test email via Mailgun (Admin)' })
  @ApiResponse({ status: 200, description: 'Test email sent successfully' })
  @ApiResponse({ status: 400, description: 'Failed to send test email' })
  async sendTestEmail(@Body() data: {
    to: string;
    subject?: string;
    message?: string;
  }) {
    const subject = data.subject || 'Test Email from Agent Portal';
    const message = data.message || 'This is a test email sent via Mailgun to verify email service configuration.';

    const success = await this.emailService.sendEmail({
      to: data.to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">🚀 Agent Portal Test Email</h2>
          <p style="font-size: 16px; line-height: 1.6;">${message}</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #6c757d;">
              <strong>✅ Email Service Status:</strong> Mailgun integration working correctly!<br>
              <strong>📧 Sent via:</strong> Mailgun API<br>
              <strong>🕒 Timestamp:</strong> ${new Date().toISOString()}
            </p>
          </div>
          <p style="color: #6c757d; font-size: 14px;">
            This email was sent from the Agent Portal email testing system.
          </p>
        </div>
      `,
      text: `${message}\n\nEmail Service Status: Mailgun integration working correctly!\nSent via: Mailgun API\nTimestamp: ${new Date().toISOString()}`,
    });

    return {
      success,
      message: success 
        ? `Test email sent successfully to ${data.to}` 
        : `Failed to send test email to ${data.to}`,
      emailData: {
        to: data.to,
        subject,
        sentAt: new Date().toISOString(),
        service: 'Mailgun',
      },
    };
  }

  @Post('test-template')
  @ApiOperation({ summary: 'Send test email with template (Admin)' })
  @ApiResponse({ status: 200, description: 'Template test email sent successfully' })
  async sendTestTemplateEmail(@Body() data: {
    to: string;
    template?: string;
    firstName?: string;
  }) {
    const template = data.template || 'notification-general';
    const firstName = data.firstName || 'Test User';

    const success = await this.emailService.sendEmail({
      to: data.to,
      subject: '🧪 Template Test - Agent Portal',
      template,
      templateData: {
        firstName,
        title: 'Email Template Test',
        message: 'This is a test email using the Agent Portal email template system with Mailgun integration.',
        actionUrl: 'https://your-portal.com/dashboard',
        actionText: 'Visit Dashboard',
        dashboardUrl: 'https://your-portal.com/dashboard',
        priority: 'medium',
        type: 'system',
      },
    });

    return {
      success,
      message: success 
        ? `Template test email sent successfully to ${data.to}` 
        : `Failed to send template test email to ${data.to}`,
      templateData: {
        template,
        to: data.to,
        firstName,
        sentAt: new Date().toISOString(),
        service: 'Mailgun',
      },
    };
  }

  @Get('service-status')
  @ApiOperation({ summary: 'Check email service configuration status (Admin)' })
  @ApiResponse({ status: 200, description: 'Email service status' })
  getEmailServiceStatus() {
    // Access private properties via bracket notation for status check
    const emailService = this.emailService as any;
    const isConfigured = !!emailService.mailgunClient;
    const domain = emailService.domain;
    const fromEmail = emailService.fromEmail;

    return {
      service: 'Mailgun',
      configured: isConfigured,
      domain: domain || 'Not configured',
      fromEmail: fromEmail || 'Not configured',
      status: isConfigured ? 'Ready' : 'Not configured',
      message: isConfigured 
        ? 'Mailgun email service is properly configured and ready to send emails.'
        : 'Mailgun email service is not configured. Please check your environment variables.',
      requiredEnvVars: [
        'MAILGUN_API_KEY',
        'MAILGUN_DOMAIN',
        'MAILGUN_FROM_EMAIL (optional)',
        'MAILGUN_API_URL (optional)',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  @Post('debug-connection')
  @ApiOperation({ summary: 'Debug Mailgun connection with detailed logging (Admin)' })
  @ApiResponse({ status: 200, description: 'Connection debug information' })
  async debugConnection() {
    const emailService = this.emailService as any;
    const debugInfo = {
      timestamp: new Date().toISOString(),
      mailgunClient: !!emailService.mailgunClient,
      domain: emailService.domain,
      fromEmail: emailService.fromEmail,
      connectionTest: null as any,
      environmentCheck: {
        MAILGUN_API_KEY: !!process.env.MAILGUN_API_KEY,
        MAILGUN_DOMAIN: !!process.env.MAILGUN_DOMAIN,
        MAILGUN_FROM_EMAIL: !!process.env.MAILGUN_FROM_EMAIL,
        MAILGUN_API_URL: process.env.MAILGUN_API_URL || 'default',
      },
    };

    if (emailService.mailgunClient && emailService.domain) {
      try {
        console.log('🔍 Testing Mailgun connection...');
        const domainInfo = await emailService.mailgunClient.domains.get(emailService.domain);
        debugInfo.connectionTest = {
          success: true,
          domainState: domainInfo.domain?.state,
          domainType: domainInfo.domain?.type,
          message: 'Connection successful',
        };
        console.log('✅ Connection test passed');
      } catch (error) {
        debugInfo.connectionTest = {
          success: false,
          error: error.message,
          status: error.status,
          details: error.details,
        };
        console.log('❌ Connection test failed:', error.message);
      }
    } else {
      debugInfo.connectionTest = {
        success: false,
        error: 'Mailgun client or domain not configured',
      };
    }

    return debugInfo;
  }

  @Post('debug-send')
  @ApiOperation({ summary: 'Send debug email with full logging (Admin)' })
  @ApiResponse({ status: 200, description: 'Debug email sent with detailed logs' })
  async debugSendEmail(@Body() data: {
    to: string;
    includeHtml?: boolean;
  }) {
    const startTime = Date.now();
    console.log('🚀 Starting debug email send...');

    const debugData = {
      timestamp: new Date().toISOString(),
      recipient: data.to,
      steps: [] as any[],
      result: null as any,
      totalTime: 0,
    };

    try {
      // Step 1: Check service configuration
      debugData.steps.push({
        step: 1,
        name: 'Configuration Check',
        timestamp: new Date().toISOString(),
        status: 'starting',
      });

      const statusCheck = this.getEmailServiceStatus();
      debugData.steps[0].status = statusCheck.configured ? 'success' : 'failed';
      debugData.steps[0].details = statusCheck;

      if (!statusCheck.configured) {
        throw new Error('Email service not configured');
      }

      // Step 2: Prepare email content
      debugData.steps.push({
        step: 2,
        name: 'Content Preparation',
        timestamp: new Date().toISOString(),
        status: 'starting',
      });

      const emailContent = {
        to: data.to,
        subject: '🔧 Debug Email Test - Agent Portal Mailgun Integration',
        html: data.includeHtml ? `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">🔧 Mailgun Debug Test</h2>
            <p>This is a debug email to test the Mailgun integration.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
              <h3>Debug Information:</h3>
              <ul>
                <li><strong>Sent at:</strong> ${new Date().toISOString()}</li>
                <li><strong>Service:</strong> Mailgun API</li>
                <li><strong>Environment:</strong> ${process.env.NODE_ENV}</li>
                <li><strong>Domain:</strong> ${(this.emailService as any).domain}</li>
              </ul>
            </div>
          </div>
        ` : undefined,
        text: `Debug Email Test\n\nThis is a debug email to test the Mailgun integration.\n\nSent at: ${new Date().toISOString()}\nService: Mailgun API\nEnvironment: ${process.env.NODE_ENV}`,
      };

      debugData.steps[1].status = 'success';
      debugData.steps[1].details = {
        htmlLength: emailContent.html?.length || 0,
        textLength: emailContent.text?.length || 0,
      };

      // Step 3: Send email
      debugData.steps.push({
        step: 3,
        name: 'Email Sending',
        timestamp: new Date().toISOString(),
        status: 'starting',
      });

      const sendSuccess = await this.emailService.sendEmail(emailContent);
      
      debugData.steps[2].status = sendSuccess ? 'success' : 'failed';
      debugData.steps[2].details = { success: sendSuccess };

      debugData.result = {
        success: sendSuccess,
        message: sendSuccess ? 'Debug email sent successfully' : 'Debug email failed to send',
      };

    } catch (error) {
      const currentStep = debugData.steps[debugData.steps.length - 1];
      if (currentStep) {
        currentStep.status = 'failed';
        currentStep.error = error.message;
      }

      debugData.result = {
        success: false,
        error: error.message,
      };
    }

    debugData.totalTime = Date.now() - startTime;
    console.log(`🏁 Debug email process completed in ${debugData.totalTime}ms`);

    return debugData;
  }

  @Post('test-formdata-fix')
  @ApiOperation({ summary: 'Test FormData constructor fix for Mailgun (Admin)' })
  @ApiResponse({ status: 200, description: 'FormData test results' })
  async testFormDataFix(@Body() data: { to: string }) {
    const testResult = {
      timestamp: new Date().toISOString(),
      recipient: data.to,
      formDataTest: null as any,
      mailgunTest: null as any,
      emailSendTest: null as any,
    };

    try {
      // Test 1: FormData constructor
      console.log('🧪 Testing FormData constructor...');
      const FormData = require('form-data');
      const form = new FormData();
      form.append('test', 'value');
      testResult.formDataTest = {
        success: true,
        message: 'FormData constructor working correctly',
      };
      console.log('✅ FormData constructor test passed');

      // Test 2: Mailgun client creation
      console.log('🧪 Testing Mailgun client creation...');
      const Mailgun = require('mailgun.js');
      const mailgun = new Mailgun(FormData);
      testResult.mailgunTest = {
        success: true,
        message: 'Mailgun client created successfully',
      };
      console.log('✅ Mailgun client creation test passed');

      // Test 3: Simple email send
      console.log('🧪 Testing simple email send...');
      const emailSuccess = await this.emailService.sendEmail({
        to: data.to,
        subject: '🧪 FormData Fix Test - Agent Portal',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #28a745;">✅ FormData Fix Successful!</h2>
            <p>This email was sent successfully using the fixed FormData constructor.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Test Details:</strong></p>
              <ul>
                <li>FormData constructor: ✅ Working</li>
                <li>Mailgun client: ✅ Working</li>
                <li>Email delivery: ✅ Working</li>
                <li>Timestamp: ${new Date().toISOString()}</li>
              </ul>
            </div>
            <p style="color: #6c757d; font-size: 14px;">This confirms that the Mailgun integration is now fully functional.</p>
          </div>
        `,
        text: `FormData Fix Test - The Mailgun integration is now working correctly! Sent at: ${new Date().toISOString()}`,
      });

      testResult.emailSendTest = {
        success: emailSuccess,
        message: emailSuccess ? 'Email sent successfully' : 'Email send failed',
      };

    } catch (error) {
      console.error('❌ FormData test failed:', error);
      
      if (!testResult.formDataTest) {
        testResult.formDataTest = { success: false, error: error.message };
      } else if (!testResult.mailgunTest) {
        testResult.mailgunTest = { success: false, error: error.message };
      } else {
        testResult.emailSendTest = { success: false, error: error.message };
      }
    }

    return testResult;
  }
}
