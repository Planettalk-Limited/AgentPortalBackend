import { Body, Controller, Get, Header, HttpCode, Logger, NotAcceptableException, Post, Query } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { LifecycleEmailsService } from './lifecycle-emails.service';
import { LifecycleTrackingService, MailgunWebhookBody } from './lifecycle-tracking.service';
import { verifyMailgunSignature, verifyUnsubscribeToken } from './lifecycle-security';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUPPORT = '<a href="mailto:partners@planettalk.com">partners@planettalk.com</a>';

function page(title: string, message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7f8;margin:0;padding:48px 16px;color:#1f2937">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border-top:4px solid #24B6C3">
<h1 style="font-size:20px;margin:0 0 12px">${title}</h1><p style="line-height:1.5;margin:0">${message}</p>
</div></body></html>`;
}

/** Unauthenticated endpoints: the unsubscribe link in each email, and Mailgun's event webhook. */
@ApiTags('Partner Lifecycle Emails')
@Controller('lifecycle-emails')
export class LifecycleEmailsPublicController {
  private readonly logger = new Logger(LifecycleEmailsPublicController.name);

  constructor(
    private readonly lifecycle: LifecycleEmailsService,
    private readonly tracking: LifecycleTrackingService,
  ) {}

  private async unsubscribe(agent: string, token: string, emailId?: string): Promise<boolean> {
    if (!UUID.test(agent || '') || !verifyUnsubscribeToken(agent, token, this.lifecycle.config.unsubscribeSecret)) {
      return false;
    }
    const validEmailId = UUID.test(emailId || '') ? emailId : undefined;
    return this.tracking.unsubscribeAgent(agent, 'email_link', new Date(), validEmailId);
  }

  @Get('unsubscribe')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async unsubscribePage(@Query('agent') agent: string, @Query('token') token: string, @Query('e') emailId?: string) {
    const ok = await this.unsubscribe(agent, token, emailId);
    return ok
      ? page(
          "You've been unsubscribed",
          `You won't receive any more PlanetTalk Partner tips and milestone emails. You'll still get important account emails such as payouts and security alerts. Changed your mind? Email ${SUPPORT}.`,
        )
      : page('Link not valid', `This unsubscribe link is invalid or incomplete. Please email ${SUPPORT} and we will remove you.`);
  }

  /** RFC 8058 one-click unsubscribe (the "Unsubscribe" button Gmail and Yahoo show). */
  @Post('unsubscribe')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async unsubscribeOneClick(@Query('agent') agent: string, @Query('token') token: string, @Query('e') emailId?: string) {
    return { success: await this.unsubscribe(agent, token, emailId) };
  }

  /**
   * Mailgun event webhook (delivered / opened / clicked / unsubscribed / complained / failed).
   * Configure in Mailgun > Sending > Webhooks with URL <public api>/lifecycle-emails/webhooks/mailgun.
   * 406 tells Mailgun not to retry a request we reject.
   */
  @Post('webhooks/mailgun')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async mailgunWebhook(@Body() body: MailgunWebhookBody) {
    if (!verifyMailgunSignature(body?.signature, this.lifecycle.config.mailgunWebhookSigningKey)) {
      this.logger.warn('Rejected Mailgun webhook with missing or invalid signature');
      throw new NotAcceptableException('Invalid signature');
    }
    return this.tracking.recordMailgunEvent(body);
  }
}
