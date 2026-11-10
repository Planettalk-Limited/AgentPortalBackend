import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleGuard } from './admin-role.guard';
import { LifecycleEmailsService } from './lifecycle-emails.service';
import { LifecycleTrackingService } from './lifecycle-tracking.service';

function parseDate(value: string | undefined, name: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new BadRequestException(`${name} must be an ISO date`);
  return d;
}

@ApiTags('Admin - Partner Lifecycle Emails')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminRoleGuard)
@Controller('admin/lifecycle-emails')
export class AdminLifecycleEmailsController {
  constructor(
    private readonly lifecycle: LifecycleEmailsService,
    private readonly tracking: LifecycleTrackingService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Per-template and per-segment sent / open / click / conversion figures' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date (inclusive), filters on send time' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date (exclusive)' })
  getStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.tracking.getStats({ from: parseDate(from, 'from'), to: parseDate(to, 'to') });
  }

  @Get('preview')
  @ApiOperation({ summary: 'Dry run: who WOULD receive each lifecycle email today. Writes nothing, sends nothing.' })
  @ApiQuery({ name: 'at', required: false, description: 'Evaluate as if it were this ISO date-time (default: now)' })
  preview(@Query('at') at?: string) {
    return this.lifecycle.run({ dryRun: true, trigger: 'admin', now: parseDate(at, 'at') });
  }

  @Post('run')
  @ApiOperation({ summary: 'Run the daily lifecycle pass now. Idempotent; refuses unless LIFECYCLE_EMAILS_ENABLED=true.' })
  runNow() {
    return this.lifecycle.run({ dryRun: false, trigger: 'admin' });
  }

  @Get('config')
  @ApiOperation({ summary: 'Effective lifecycle email settings (secrets omitted)' })
  getConfig() {
    const { unsubscribeSecret, mailgunWebhookSigningKey, ...rest } = this.lifecycle.config;
    return {
      ...rest,
      unsubscribeSecretConfigured: !!unsubscribeSecret,
      mailgunWebhookSigningKeyConfigured: !!mailgunWebhookSigningKey,
    };
  }

  @Get('partners/:agentId')
  @ApiOperation({ summary: 'One partner: lifecycle state and every lifecycle email logged for them' })
  getPartner(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.tracking.getPartnerHistory(agentId);
  }

  @Post('partners/:agentId/resubscribe')
  @ApiOperation({ summary: "Clear a partner's lifecycle email opt-out (only at the partner's request)" })
  async resubscribe(@Param('agentId', ParseUUIDPipe) agentId: string) {
    await this.tracking.resubscribeAgent(agentId);
    return { success: true };
  }
}
