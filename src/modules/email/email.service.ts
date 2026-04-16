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
  previewText?: string;
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
    const apiUrl = this.configService.get('MAILGUN_API_URL') || 'https://api.mailgun.net'; // Default to US

    // Debug environment variables (without exposing sensitive data)
    this.logger.debug('📋 Mailgun Configuration Check:');
    this.logger.debug(`   - API Key: ${apiKey ? `✅ Present (${apiKey.substring(0, 8)}...)` : '❌ Missing'}`);
    this.logger.debug(`   - Domain: ${domain ? `✅ ${domain}` : '❌ Missing'}`);
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
      // Hardcoded from email for all outgoing emails
      this.fromEmail = 'PlanetTalk Agent <agent@planettalk.com>';
      
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

  /** Base URL for partner portal (localisation /en path). */
  getPartnerPortalBaseUrl(): string {
    if (process.env.NODE_ENV === 'production') {
      return 'https://portal.planettalk.com/en';
    }
    const fe = this.configService.get<string>('FRONTEND_URL');
    return fe ? `${fe}/en` : 'http://localhost:3001/en';
  }

  async sendIndividualPartnerRegistrationAcknowledgement(
    email: string,
    firstName: string,
    portalUrl?: string,
  ): Promise<boolean> {
    const subject = `${firstName}, we received your individual partner registration`;
    const base = portalUrl ?? this.getPartnerPortalBaseUrl();
    return this.sendEmail({
      to: email,
      subject,
      template: 'individual-partner-registration-acknowledgement',
      templateData: { firstName, portalUrl: base },
      previewText: 'Next: verify your email with the code we send in a separate message.',
    });
  }

  async sendBusinessPartnerRegistrationAcknowledgement(
    email: string,
    firstName: string,
    companyName: string,
    meetingBookingUrl: string,
    portalUrl?: string,
  ): Promise<boolean> {
    const subject = `${firstName}, we received the partner application for ${companyName}`;
    const base = portalUrl ?? this.getPartnerPortalBaseUrl();
    return this.sendEmail({
      to: email,
      subject,
      template: 'business-partner-registration-acknowledgement',
      templateData: {
        firstName,
        companyName,
        meetingBookingUrl,
        portalUrl: base,
      },
      previewText:
        "Verify your email next. Your organisation's account activates after our team approves it.",
    });
  }

  async sendIndividualPartnerWelcomeEmail(
    templateData: Record<string, any>,
  ): Promise<boolean> {
    return this.sendEmail({
      to: templateData.email,
      subject: `${templateData.firstName}, your PlanetTalk partner account is ready`,
      template: 'individual-partner-welcome',
      templateData,
      previewText:
        'Log in with your email, share your partner code, and track your earnings.',
    });
  }

  async sendBusinessPartnerWelcomeEmail(
    templateData: Record<string, any>,
  ): Promise<boolean> {
    return this.sendEmail({
      to: templateData.email,
      subject: `${templateData.companyName} is approved — welcome to PlanetTalk Partners`,
      template: 'business-partner-welcome',
      templateData,
      previewText:
        "Your organisation's partner code is ready. Log in to complete onboarding.",
    });
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
          previewText: options.previewText,
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
    const subject = `Welcome, ${firstName}! Your PlanetTalk Agent Journey Begins 🎉`;

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
      },
    });
  }

  async sendAdminInvite(
    email: string,
    firstName: string,
    temporaryPassword: string,
    loginUrl: string,
  ): Promise<boolean> {
    const subject = 'Your PlanetTalk Admin Access is Ready';

    return this.sendEmail({
      to: email,
      subject,
      template: 'admin-invite',
      templateData: {
        firstName,
        email,
        temporaryPassword,
        loginUrl,
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
    const subject = 'Reset Your PlanetTalk Agent Password';

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
      },
    });
  }

  async sendEmailVerificationOTP(
    email: string,
    firstName: string,
    otp: string,
    partnerType: 'individual' | 'business' = 'individual',
  ): Promise<boolean> {
    const portalUrl = this.getPartnerPortalBaseUrl();
    const isBusiness = partnerType === 'business';
    const subject = isBusiness
      ? 'Verify your email — business partner application'
      : 'Verify your email — individual partner account';
    const template = isBusiness
      ? 'business-partner-verify-email'
      : 'individual-partner-verify-email';

    return this.sendEmail({
      to: email,
      subject,
      template,
      templateData: {
        firstName,
        otp,
        expiryMinutes: 15,
        verificationTime: new Date().toLocaleString(),
        portalUrl,
      },
    });
  }

  async sendBusinessPartnerEmailVerifiedConfirmation(
    email: string,
    firstName: string,
    meetingBookingUrl: string,
  ): Promise<boolean> {
    const subject = 'Email verified — next steps for your PlanetTalk partner application';

    return this.sendEmail({
      to: email,
      subject,
      template: 'business-partner-email-verified',
      templateData: {
        firstName,
        meetingBookingUrl,
        portalUrl: process.env.NODE_ENV === 'production' 
          ? 'https://portal.planettalk.com/en'
          : (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/en` : 'http://localhost:3001/en'),
      },
      previewText:
        'Your email is verified. Book a meeting if you wish while we review your application.',
    });
  }

  async sendBusinessApplicationAdminNotification(payload: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
    country: string;
    companyName: string;
    businessAddress?: string | null;
    primaryBusinessActivity?: string | null;
    primarySpecialty?: string | null;
    customerInteractionType?: string | null;
    sellsInternationalGoods?: boolean | null;
    expectedVolume?: string | null;
    region?: string | null;
    companyRegistrationNumber?: string | null;
    emailVerified: boolean;
  }): Promise<void> {
    const raw =
      this.configService.get<string>('ADMIN_BUSINESS_APPLICATION_EMAILS') || '';
    const recipients = raw
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      this.logger.warn(
        'ADMIN_BUSINESS_APPLICATION_EMAILS is not set; skipping admin notification for business registration',
      );
      return;
    }

    const meetingBookingUrl =
      this.configService.get<string>('PARTNER_MEETING_BOOKING_URL')?.trim() ||
      '';

    const activityLabels: Record<string, string> = {
      grocery_convenience: 'Grocery / Convenience',
      restaurant_cafe: 'Restaurant / Cafe',
      bar_pub: 'Bar / Pub',
      specialty_food_import: 'Specialty Food Import',
      professional_services: 'Professional Services',
      other: 'Other',
    };

    const interactionLabels: Record<string, string> = {
      sit_down_table_service: 'Sit-down / Table Service',
      grab_and_go: 'Grab-and-go / Over the counter',
      appointment_based: 'Appointment based',
    };

    const lines = [
      'New business partner self-registration',
      `User ID: ${payload.userId}`,
      `Name: ${payload.firstName} ${payload.lastName}`,
      `Email: ${payload.email}`,
      `Phone: ${payload.phoneNumber || '—'}`,
      `Country: ${payload.country}`,
      `Company: ${payload.companyName}`,
      `Business address: ${payload.businessAddress || '—'}`,
      `Primary business activity: ${payload.primaryBusinessActivity ? (activityLabels[payload.primaryBusinessActivity] || payload.primaryBusinessActivity) : '—'}`,
      `Primary specialty: ${payload.primarySpecialty || '—'}`,
      `Customer interaction: ${payload.customerInteractionType ? (interactionLabels[payload.customerInteractionType] || payload.customerInteractionType) : '—'}`,
      `Sells international / ethnic goods: ${payload.sellsInternationalGoods != null ? (payload.sellsInternationalGoods ? 'Yes' : 'No') : '—'}`,
      ...(payload.expectedVolume ? [`Expected volume: ${payload.expectedVolume}`] : []),
      ...(payload.region ? [`Region: ${payload.region}`] : []),
      `Company registration: ${payload.companyRegistrationNumber || '—'}`,
      `Email verified (at submit): ${payload.emailVerified ? 'yes' : 'no'}`,
      meetingBookingUrl
        ? `Meeting booking link (shown to applicant — e.g. Calendly): ${meetingBookingUrl}`
        : 'Meeting booking link: (PARTNER_MEETING_BOOKING_URL not set — configure for Calendly)',
    ];

    const subject = `[Partner Portal] New business application — ${payload.companyName}`;

    for (const to of recipients) {
      await this.sendEmail({
        to,
        subject,
        template: 'business-application-admin-notify',
        templateData: {
          ...payload,
          detailLines: lines,
          submittedAt: new Date().toISOString(),
        },
      });
    }
  }

  async sendBusinessPartnerRejectionEmail(payload: {
    email: string;
    firstName: string;
    companyName: string;
    reason?: string | null;
  }): Promise<void> {
    await this.sendEmail({
      to: payload.email,
      subject: `PlanetTalk Partner Application — Update for ${payload.companyName}`,
      template: 'business-partner-rejection',
      templateData: {
        firstName: payload.firstName,
        companyName: payload.companyName,
        reason: payload.reason || null,
        supportEmail: 'agent@planettalk.com',
      },
    });
  }

}
