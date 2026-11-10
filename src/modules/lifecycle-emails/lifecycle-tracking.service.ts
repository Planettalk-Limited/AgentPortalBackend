import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { PartnerLifecycleState } from './entities/partner-lifecycle-state.entity';
import { LifecycleEmail } from './entities/lifecycle-email.entity';
import { LifecycleEmailEvent } from './entities/lifecycle-email-event.entity';
import { listLifecycleTemplates, getLifecycleTemplate } from './lifecycle-templates';
import { toStateView } from './lifecycle.store';

/** Mailgun event names we act on (new-style JSON webhooks). */
const TRACKED_EVENTS = new Set(['delivered', 'opened', 'clicked', 'unsubscribed', 'complained', 'failed']);

const CONVERSION_DEFINITIONS: Record<string, string> = {
  onboarding: 'Partner made a referral within the attribution window after this email (first referral for most onboarding emails).',
  previously_active: 'Partner made a new referral within the attribution window after this email.',
  inactive: 'Partner made a referral, or came back (login/referral) and received "Welcome back", within the attribution window.',
  referral_milestone: 'Not measured (celebration email).',
  earnings: 'Not measured (earnings email).',
  active: 'Not measured (engagement email).',
  internal: 'Not applicable (sent to the partner team).',
};

export interface MailgunWebhookBody {
  signature?: { timestamp?: string; token?: string; signature?: string };
  'event-data'?: Record<string, any>;
}

@Injectable()
export class LifecycleTrackingService {
  private readonly logger = new Logger(LifecycleTrackingService.name);

  constructor(
    @InjectRepository(LifecycleEmail) private readonly emails: Repository<LifecycleEmail>,
    @InjectRepository(LifecycleEmailEvent) private readonly events: Repository<LifecycleEmailEvent>,
    @InjectRepository(PartnerLifecycleState) private readonly states: Repository<PartnerLifecycleState>,
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
  ) {}

  /** Records one (already signature-verified) Mailgun event. Safe to call repeatedly with the same event. */
  async recordMailgunEvent(body: MailgunWebhookBody): Promise<{ recorded: boolean; reason?: string }> {
    const data = body['event-data'];
    if (!data?.id || !data?.event) return { recorded: false, reason: 'no event-data' };
    if (!TRACKED_EVENTS.has(data.event)) return { recorded: false, reason: `event ${data.event} not tracked` };

    const messageId: string | null = data.message?.headers?.['message-id'] ?? null;
    const variables = data['user-variables'] ?? {};
    let email: LifecycleEmail | null = null;
    if (variables.lifecycle_email_id) {
      email = await this.emails.findOne({ where: { id: String(variables.lifecycle_email_id) } });
    }
    if (!email && messageId) {
      email = await this.emails.findOne({ where: { mailgunMessageId: messageId } });
    }
    // Mailgun webhooks are per domain, so most events belong to other (transactional) emails.
    if (!email) return { recorded: false, reason: 'not a lifecycle email' };

    const occurredAt = data.timestamp ? new Date(Number(data.timestamp) * 1000) : new Date();
    const inserted = await this.events
      .createQueryBuilder()
      .insert()
      .into(LifecycleEmailEvent)
      .values({
        mailgunEventId: String(data.id),
        lifecycleEmailId: email.id,
        mailgunMessageId: messageId,
        event: data.event,
        recipient: data.recipient ?? null,
        url: data.url ?? null,
        occurredAt,
        payload: { severity: data.severity, reason: data.reason, tags: data.tags, 'delivery-status': data['delivery-status'] },
      })
      .orIgnore()
      .returning(['id'])
      .execute();
    if (!inserted.raw?.length) return { recorded: false, reason: 'duplicate event' };

    const qb = this.emails.createQueryBuilder().update(LifecycleEmail).where('id = :id', { id: email.id });
    switch (data.event) {
      case 'delivered':
        await qb.set({ deliveredAt: () => `COALESCE("deliveredAt", :at)` }).setParameter('at', occurredAt).execute();
        break;
      case 'opened':
        await qb
          .set({ openCount: () => '"openCount" + 1', firstOpenedAt: () => `COALESCE("firstOpenedAt", :at)` })
          .setParameter('at', occurredAt)
          .execute();
        break;
      case 'clicked':
        // A click proves the email was opened even when the tracking pixel was blocked.
        await qb
          .set({
            clickCount: () => '"clickCount" + 1',
            firstClickedAt: () => `COALESCE("firstClickedAt", :at)`,
            firstOpenedAt: () => `COALESCE("firstOpenedAt", :at)`,
          })
          .setParameter('at', occurredAt)
          .execute();
        break;
      case 'unsubscribed':
      case 'complained':
        await qb.set({ unsubscribedAt: () => `COALESCE("unsubscribedAt", :at)` }).setParameter('at', occurredAt).execute();
        await this.unsubscribeAgent(email.agentId, `mailgun_${data.event}`, occurredAt);
        break;
      case 'failed':
        if (data.severity === 'permanent') {
          await qb.set({ lastError: `Mailgun permanent failure: ${data.reason ?? 'unknown'}` }).execute();
        }
        break;
    }
    return { recorded: true };
  }

  /** Opt a partner out of lifecycle emails. Returns false if the agent does not exist. */
  async unsubscribeAgent(agentId: string, source: string, at = new Date(), emailId?: string): Promise<boolean> {
    const state = await this.states.findOne({ where: { agentId } });
    if (state) {
      if (!state.unsubscribedAt) {
        await this.states.update(agentId, { unsubscribedAt: at, unsubscribeSource: source });
      }
    } else {
      const agent = await this.agents.findOne({ where: { id: agentId }, select: ['id', 'userId'] });
      if (!agent) return false;
      // Not yet seen by the daily job: the job will baseline everything else on its first pass.
      await this.states.insert({
        agentId,
        userId: agent.userId,
        trackingStartedAt: at,
        unsubscribedAt: at,
        unsubscribeSource: source,
        earningsBaseline: null,
      });
    }
    if (emailId) {
      await this.emails
        .createQueryBuilder()
        .update(LifecycleEmail)
        .set({ unsubscribedAt: () => `COALESCE("unsubscribedAt", :at)` })
        .setParameter('at', at)
        .where('id = :emailId AND "agentId" = :agentId', { emailId, agentId })
        .execute();
    }
    return true;
  }

  async resubscribeAgent(agentId: string): Promise<void> {
    const result = await this.states.update(agentId, { unsubscribedAt: null, unsubscribeSource: null });
    if (!result.affected) throw new NotFoundException('No lifecycle state for this partner');
  }

  /** Per-template dashboard figures. Rates are over emails sent. */
  async getStats(range: { from?: Date; to?: Date }) {
    const qb = this.emails
      .createQueryBuilder('e')
      .select('e.templateKey', 'templateKey')
      .addSelect('e.segment', 'segment')
      .addSelect(`COUNT(*) FILTER (WHERE e.status = 'sent')`, 'sent')
      .addSelect(`COUNT(*) FILTER (WHERE e.status = 'failed')`, 'failed')
      .addSelect(`COUNT(*) FILTER (WHERE e.status = 'suppressed')`, 'suppressed')
      .addSelect(`COUNT(*) FILTER (WHERE e.status = 'sent' AND (e.context->>'simulated') = 'true')`, 'simulated')
      .addSelect('COUNT(e.deliveredAt)', 'delivered')
      .addSelect('COUNT(e.firstOpenedAt)', 'opened')
      .addSelect('COUNT(e.firstClickedAt)', 'clicked')
      .addSelect('COUNT(e.convertedAt)', 'converted')
      .addSelect('COUNT(e.unsubscribedAt)', 'unsubscribed')
      .groupBy('e.templateKey')
      .addGroupBy('e.segment');
    if (range.from) qb.andWhere('COALESCE(e.sentAt, e.createdAt) >= :from', { from: range.from });
    if (range.to) qb.andWhere('COALESCE(e.sentAt, e.createdAt) < :to', { to: range.to });
    const rows = await qb.getRawMany();

    const rate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
    const templates = rows
      .map((r) => {
        const sent = Number(r.sent) || 0;
        const opened = Number(r.opened) || 0;
        const clicked = Number(r.clicked) || 0;
        const converted = Number(r.converted) || 0;
        const tpl = getLifecycleTemplate(r.templateKey);
        return {
          templateKey: r.templateKey,
          segment: r.segment,
          subject: tpl?.subject ?? r.templateKey,
          sent,
          simulated: Number(r.simulated) || 0,
          failed: Number(r.failed) || 0,
          suppressed: Number(r.suppressed) || 0,
          delivered: Number(r.delivered) || 0,
          opened,
          clicked,
          converted,
          unsubscribed: Number(r.unsubscribed) || 0,
          openRate: rate(opened, sent),
          clickRate: rate(clicked, sent),
          conversionRate: rate(converted, sent),
        };
      })
      .sort((a, b) => a.segment.localeCompare(b.segment) || a.templateKey.localeCompare(b.templateKey));

    const segments: Record<string, { sent: number; opened: number; clicked: number; converted: number; openRate: number | null; clickRate: number | null; conversionRate: number | null; conversionDefinition: string }> = {};
    for (const t of templates) {
      const s = (segments[t.segment] ??= {
        sent: 0, opened: 0, clicked: 0, converted: 0, openRate: null, clickRate: null, conversionRate: null,
        conversionDefinition: CONVERSION_DEFINITIONS[t.segment] ?? '',
      });
      s.sent += t.sent;
      s.opened += t.opened;
      s.clicked += t.clicked;
      s.converted += t.converted;
    }
    for (const s of Object.values(segments)) {
      s.openRate = rate(s.opened, s.sent);
      s.clickRate = rate(s.clicked, s.sent);
      s.conversionRate = rate(s.converted, s.sent);
    }

    const audience = await this.states
      .createQueryBuilder('s')
      .select('COUNT(*)', 'tracked')
      .addSelect('COUNT(s.quietAt)', 'quiet')
      .addSelect('COUNT(s.unsubscribedAt)', 'unsubscribed')
      .addSelect('COUNT(s.inactiveTrackStartedAt)', 'inInactiveTrack')
      .getRawOne();

    return {
      range: { from: range.from ?? null, to: range.to ?? null },
      notes: [
        'Rates are percentages of emails sent. Open rates are inflated by Apple Mail Privacy Protection and similar; treat clicks and conversions as the reliable signals.',
        'Opened/clicked/delivered only populate once the Mailgun webhook is configured (see MAILGUN_WEBHOOK_SIGNING_KEY).',
        '"simulated" counts emails logged while Mailgun was not configured (no real send).',
      ],
      audience: {
        partnersTracked: Number(audience?.tracked) || 0,
        quietList: Number(audience?.quiet) || 0,
        unsubscribed: Number(audience?.unsubscribed) || 0,
        inInactiveTrack: Number(audience?.inInactiveTrack) || 0,
      },
      segments,
      templates,
      catalogue: listLifecycleTemplates().map((t) => ({
        key: t.key,
        segment: t.segment,
        subject: t.subject,
        draft: t.draft,
        managedElsewhere: t.managedElsewhere ?? null,
      })),
    };
  }

  async getPartnerHistory(agentId: string) {
    const [state, emails] = await Promise.all([
      this.states.findOne({ where: { agentId } }),
      this.emails.find({ where: { agentId }, order: { createdAt: 'DESC' } }),
    ]);
    return { state: state ? toStateView(state) : null, emails };
  }
}
