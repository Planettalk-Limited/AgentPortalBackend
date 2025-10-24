import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailgun from 'mailgun.js';
import * as FormData from 'form-data';
import { TemplateService, TemplateData } from './template.service';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: TemplateData;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private mailgunClient: any;
  private domain: string;
  private fromEmail: string;

  constructor(
    private configService: ConfigService,
    private templateService: TemplateService,
  ) {
    this.initializeMailgun();
  }

  private initializeMailgun() {
    this.logger.log('🔧 Initializing Mailgun email service...');
    
    const apiKey = this.configService.get('MAILGUN_API_KEY');
    const domain = this.configService.get('MAILGUN_DOMAIN');
    const fromEmail = this.configService.get('MAILGUN_FROM_EMAIL');
    const apiUrl = this.configService.get('MAILGUN_API_URL') || 'https://api.mailgun.net'; // Default to US

    // Debug environment variables (without exposing sensitive data)
    this.logger.debug('📋 Mailgun Configuration Check:');
    this.logger.debug(`   - API Key: ${apiKey ? `✅ Present (${apiKey.substring(0, 8)}...)` : '❌ Missing'}`);
    this.logger.debug(`   - Domain: ${domain ? `✅ ${domain}` : '❌ Missing'}`);
    this.logger.debug(`   - From Email: ${fromEmail ? `✅ ${fromEmail}` : `📧 Auto-generated`}`);
    this.logger.debug(`   - API URL: ${apiUrl}`);

    if (!apiKey || !domain) {
      this.logger.warn('❌ Mailgun service not configured. Required: MAILGUN_API_KEY and MAILGUN_DOMAIN');
      this.logger.warn('📧 Emails will be logged to console instead of sent via Mailgun');
      return;
    }

    try {
      const mailgun = new Mailgun(FormData);
      this.mailgunClient = mailgun.client({
        username: 'api',
        key: apiKey,
        url: apiUrl,
      });

      this.domain = domain;
      this.fromEmail = fromEmail || `Agent Portal <noreply@${domain}>`;
      
      this.logger.log('✅ Mailgun service initialized successfully');
      this.logger.log(`📧 Ready to send emails from: ${this.fromEmail}`);
      this.logger.log(`🌐 Using Mailgun endpoint: ${apiUrl}`);
      
      // Test connection on startup
      this.testMailgunConnection();
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize Mailgun client:', error);
      this.mailgunClient = null;
    }
  }

  private async testMailgunConnection() {
    if (!this.mailgunClient) return;

    try {
      this.logger.debug('🔍 Testing Mailgun connection...');
      
      // Test domain validation by attempting to get domain info
      const domainInfo = await this.mailgunClient.domains.get(this.domain);
      this.logger.log(`✅ Mailgun connection successful - Domain verified: ${this.domain}`);
      this.logger.debug(`📊 Domain status: ${domainInfo.domain?.state || 'unknown'}`);
      
    } catch (error) {
      this.logger.warn('⚠️ Mailgun connection test failed (this might be expected with sandbox domains):');
      this.logger.warn(`   Error: ${error.message}`);
      this.logger.warn('   📧 Email sending may still work - this is just a connection test');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const startTime = Date.now();
    const emailId = `email_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.debug(`📧 [${emailId}] Starting email send process...`);
    this.logger.debug(`📧 [${emailId}] To: ${options.to}`);
    this.logger.debug(`📧 [${emailId}] Subject: ${options.subject}`);
    this.logger.debug(`📧 [${emailId}] Template: ${options.template || 'none'}`);

    try {
      let html = options.html;
      
      // If template is specified, render it
      if (options.template && options.templateData) {
        this.logger.debug(`📧 [${emailId}] Rendering template: ${options.template}`);
        const templateStart = Date.now();
        
        html = await this.templateService.renderTemplate(options.template, {
          ...options.templateData,
          title: options.subject,
        });
        
        const templateTime = Date.now() - templateStart;
        this.logger.debug(`📧 [${emailId}] Template rendered in ${templateTime}ms`);
        this.logger.debug(`📧 [${emailId}] HTML length: ${html?.length || 0} characters`);
      }

      if (!this.mailgunClient) {
        this.logger.warn(`📧 [${emailId}] ⚠️ SIMULATION MODE - Mailgun not configured`);
        this.logger.log(`📧 [${emailId}] [EMAIL SIMULATION] To: ${options.to}`);
        this.logger.log(`📧 [${emailId}] [EMAIL SIMULATION] Subject: ${options.subject}`);
        this.logger.log(`📧 [${emailId}] [EMAIL SIMULATION] Content: ${(html || options.text || '').substring(0, 200)}...`);
        return true;
      }

      const emailData = {
        from: this.fromEmail,
        to: [options.to],
        subject: options.subject,
        html: html,
        text: options.text,
      };

      this.logger.debug(`📧 [${emailId}] Sending via Mailgun...`);
      this.logger.debug(`📧 [${emailId}] From: ${this.fromEmail}`);
      this.logger.debug(`📧 [${emailId}] Domain: ${this.domain}`);
      this.logger.debug(`📧 [${emailId}] Data size: ${JSON.stringify(emailData).length} bytes`);

      const sendStart = Date.now();
      const result = await this.mailgunClient.messages.create(this.domain, emailData);
      const sendTime = Date.now() - sendStart;
      const totalTime = Date.now() - startTime;

      this.logger.log(`✅ [${emailId}] Email sent successfully via Mailgun!`);
      this.logger.log(`📧 [${emailId}] To: ${options.to}`);
      this.logger.log(`📧 [${emailId}] Subject: ${options.subject}`);
      this.logger.log(`📧 [${emailId}] Mailgun Message ID: ${result.id}`);
      this.logger.log(`📧 [${emailId}] Send time: ${sendTime}ms, Total time: ${totalTime}ms`);
      
      // Debug additional Mailgun response data
      if (result.message) {
        this.logger.debug(`📧 [${emailId}] Mailgun response: ${result.message}`);
      }

      return true;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`❌ [${emailId}] Failed to send email after ${totalTime}ms`);
      this.logger.error(`📧 [${emailId}] To: ${options.to}`);
      this.logger.error(`📧 [${emailId}] Subject: ${options.subject}`);
      this.logger.error(`📧 [${emailId}] Error details:`, {
        message: error.message,
        status: error.status,
        details: error.details,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
      });

      // Additional debugging for common issues
      if (error.message?.includes('Forbidden')) {
        this.logger.error(`📧 [${emailId}] 🚨 AUTHENTICATION ERROR: Check your MAILGUN_API_KEY`);
      } else if (error.message?.includes('domain')) {
        this.logger.error(`📧 [${emailId}] 🚨 DOMAIN ERROR: Check your MAILGUN_DOMAIN configuration`);
      } else if (error.message?.includes('authorization')) {
        this.logger.error(`📧 [${emailId}] 🚨 AUTHORIZATION ERROR: Domain may not be verified in Mailgun`);
      }

      return false;
    }
  }

  async sendAgentApplicationAcknowledgment(
    email: string,
    firstName: string,
    lastName: string,
    applicationId?: string,
    phoneNumber?: string
  ): Promise<boolean> {
    const subject = 'Agent Application Received - Thank You!';

    return this.sendEmail({
      to: email,
      subject,
      template: 'agent-application-acknowledgment',
      templateData: {
        firstName,
        lastName,
        email,
        phoneNumber,
        applicationId: applicationId || 'N/A',
        submittedDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        subtitle: 'Application Successfully Received',
      },
    });
  }

  async sendAgentCredentials(
    email: string,
    firstName: string,
    agentCode: string,
    temporaryPassword: string,
    loginUrl: string,
    additionalData?: {
      commissionRate?: number;
      agentTier?: string;
      minimumPayout?: number;
      payoutSchedule?: string;
    }
  ): Promise<boolean> {
    const subject = 'Welcome to Agent Portal - Your Login Credentials';

    return this.sendEmail({
      to: email,
      subject,
      template: 'agent-credentials',
      templateData: {
        firstName,
        agentCode,
        temporaryPassword,
        loginUrl,
        commissionRate: additionalData?.commissionRate || 10,
        agentTier: additionalData?.agentTier || 'Bronze',
        minimumPayout: additionalData?.minimumPayout || 20,
        payoutSchedule: additionalData?.payoutSchedule || 'Weekly',
        subtitle: 'Welcome to Our Agent Network!',
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string,
    resetUrl: string,
    has2FA: boolean = false
  ): Promise<boolean> {
    const subject = 'Password Reset Request - Agent Portal';

    return this.sendEmail({
      to: email,
      subject,
      template: 'password-reset',
      templateData: {
        firstName,
        resetUrl,
        resetToken,
        has2FA,
        securityNotice: has2FA 
          ? 'Note: Your account has 2FA enabled. After resetting your password, you will still need your authenticator app to log in.'
          : 'For enhanced security, consider enabling two-factor authentication after resetting your password.',
        subtitle: 'Password Reset Request',
      },
    });
  }

  async sendPayoutNotification(
    email: string,
    agentName: string,
    payoutData: {
      payoutId: string;
      amount: number;
      status: string;
      requestedDate: string;
      processedDate?: string;
      transactionId?: string;
      rejectionReason?: string;
      fees?: number;
      netAmount?: number;
      paymentMethod?: string;
      adminNotes?: string;
      dashboardUrl?: string;
      processingTime?: string;
    }
  ): Promise<boolean> {
    const subject = `Payout Status Update - ${payoutData.status.charAt(0).toUpperCase() + payoutData.status.slice(1)}`;

    return this.sendEmail({
      to: email,
      subject,
      template: 'payout-notification',
      templateData: {
        agentName,
        ...payoutData,
        dashboardUrl: payoutData.dashboardUrl || (process.env.NODE_ENV === 'production' 
          ? 'https://portal.planettalk.com/en/dashboard'
          : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/en/dashboard` : 'http://localhost:3001/en/dashboard')),
        subtitle: 'Payout Status Update',
      },
    });
  }

  // Generic template email sender
  async sendTemplateEmail(
    to: string,
    subject: string,
    templateName: string,
    templateData: TemplateData
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject,
      template: templateName,
      templateData,
    });
  }

  async send2FAStatusChangeEmail(
    email: string,
    firstName: string,
    enabled: boolean,
    ipAddress?: string,
    deviceInfo?: string,
    backupCodesGenerated: boolean = false
  ): Promise<boolean> {
    const action = enabled ? 'enabled' : 'disabled';
    const subject = `Security Alert - Two-Factor Authentication ${action.charAt(0).toUpperCase() + action.slice(1)}`;

    return this.sendEmail({
      to: email,
      subject,
      template: '2fa-status-change',
      templateData: {
        firstName,
        enabled,
        action,
        backupCodesGenerated,
        timestamp: new Date().toLocaleString(),
        ipAddress: ipAddress || 'Unknown',
        deviceInfo: deviceInfo || 'Unknown device',
        dashboardUrl: process.env.NODE_ENV === 'production' 
          ? 'https://portal.planettalk.com/en/dashboard'
          : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/en/dashboard` : 'http://localhost:3001/en/dashboard'),
        subtitle: `Two-Factor Authentication ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      },
    });
  }

  async sendOTPEmail(
    email: string,
    firstName: string,
    otp: string
  ): Promise<boolean> {
    const subject = '🔐 Your Login Code - Agent Portal';

    return this.sendEmail({
      to: email,
      subject,
      template: 'login-otp',
      templateData: {
        firstName,
        otp,
        expiryMinutes: 10,
        loginTime: new Date().toLocaleString(),
        dashboardUrl: process.env.NODE_ENV === 'production' 
          ? 'https://portal.planettalk.com/en/dashboard'
          : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/en/dashboard` : 'http://localhost:3001/en/dashboard'),
        subtitle: 'Your Login Verification Code',
      },
    });
  }

  async sendEmailVerificationOTP(
    email: string,
    firstName: string,
    otp: string
  ): Promise<boolean> {
    const subject = '📧 Verify Your Email - Agent Portal';

    return this.sendEmail({
      to: email,
      subject,
      template: 'email-verification',
      templateData: {
        firstName,
        otp,
        expiryMinutes: 15,
        verificationTime: new Date().toLocaleString(),
        portalUrl: process.env.NODE_ENV === 'production' 
          ? 'https://portal.planettalk.com/en'
          : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/en` : 'http://localhost:3001/en'),
        subtitle: 'Email Verification Required',
      },
    });
  }

}
