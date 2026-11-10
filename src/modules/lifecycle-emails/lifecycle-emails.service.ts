import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import { EmailService } from '../email/email.service';
import { LifecycleConfig, isRecipientAllowed, loadLifecycleConfig } from './lifecycle.config';
import {
  CtaTarget,
  LifecycleTemplate,
  LifecycleTemplateData,
  getLifecycleTemplate,
} from './lifecycle-templates';
import {
  Candidate,
  History,
  PartnerSnapshot,
  buildLocalClock,
  commissionEarningsOf,
  decide,
  eligibilityOf,
  observe,
} from './lifecycle.rules';
import { signUnsubscribeToken } from './lifecycle-security';
import { HistoryRow, LIFECYCLE_STORE, LifecycleStore, PartnerRecord, StoredState } from './lifecycle.store';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** A partner emailed within this window counts against today's cap (runs are ~24h apart). */
const DAILY_CAP_WINDOW_MS = 20 * HOUR_MS;

/** Segments whose emails are trying to produce a referral. */
const REFERRAL_CONVERSION_SEGMENTS = ['onboarding', 'previously_active', 'inactive'];

export type EmailOutcome =
  | 'sent'
  | 'failed'
  | 'would_send'
  | 'deferred_daily_cap'
  | 'blocked_draft_copy'
  | 'blocked_allowlist'
  | 'already_claimed';

export interface PlannedEmail {
  agentId: string;
  agentCode: string;
  partnerName: string;
  email: string;
  templateKey: string;
  dedupeKey: string;
  segment: string;
  subject: string;
  outcome: EmailOutcome;
  error?: string;
}

export interface RunReport {
  dryRun: boolean;
  trigger: 'schedule' | 'admin';
  startedAt: Date;
  finishedAt?: Date;
  skipped?: string;
  partnersEvaluated: number;
  partnersFirstSeen: number;
  emails: PlannedEmail[];
  /** templateKey -> outcome -> count */
  summary: Record<string, Partial<Record<EmailOutcome, number>>>;
  suppressed: { agentCode: string; dedupeKey: string; reason: string }[];
  transitions: { welcomeBack: string[]; enteredQuiet: string[] };
  errors: { agentCode: string; error: string }[];
}

@Injectable()
export class LifecycleEmailsService {
  private readonly logger = new Logger(LifecycleEmailsService.name);
  readonly config: LifecycleConfig;

  constructor(
    @Inject(LIFECYCLE_STORE) private readonly store: LifecycleStore,
    private readonly emailService: EmailService,
    configService: ConfigService,
  ) {
    this.config = loadLifecycleConfig((key) => configService.get<string>(key));
  }

  /**
   * One lifecycle pass over every partner. Idempotent: every email is claimed in the
   * send log under a unique (partner, dedupe key) before it is sent, so re-running
   * on the same day, or two instances running at once, cannot send anything twice.
   * A dry run evaluates exactly the same rules but writes nothing and sends nothing.
   */
  async run(options: { dryRun: boolean; trigger: 'schedule' | 'admin'; now?: Date }): Promise<RunReport> {
    const report = this.emptyReport(options.dryRun, options.trigger, options.now ?? new Date());

    if (!options.dryRun && !this.config.enabled) {
      return { ...report, skipped: 'LIFECYCLE_EMAILS_ENABLED is not true; nothing was sent', finishedAt: new Date() };
    }

    const execute = () => this.execute(report);
    if (options.dryRun) return execute();

    const result = await this.store.withRunLock(execute);
    return result ?? { ...report, skipped: 'Another lifecycle run is in progress', finishedAt: new Date() };
  }

  private emptyReport(dryRun: boolean, trigger: 'schedule' | 'admin', now: Date): RunReport {
    return {
      dryRun,
      trigger,
      startedAt: now,
      partnersEvaluated: 0,
      partnersFirstSeen: 0,
      emails: [],
      summary: {},
      suppressed: [],
      transitions: { welcomeBack: [], enteredQuiet: [] },
      errors: [],
    };
  }

  private async execute(report: RunReport): Promise<RunReport> {
    const now = report.startedAt;
    const clock = buildLocalClock(now, this.config.timeZone);
    const [prevY, prevM] = clock.previousYearMonth.split('-').map(Number);
    const [curY, curM] = clock.yearMonth.split('-').map(Number);
    // Bulk uploads stamp earnedAt as YYYY-MM-01T00:00Z, so month bounds are UTC.
    const lastMonthStart = new Date(Date.UTC(prevY, prevM - 1, 1));
    const thisMonthStart = new Date(Date.UTC(curY, curM - 1, 1));

    const [partners, states, history, lastMonth] = await Promise.all([
      this.store.loadPartners(),
      this.store.loadStates(),
      this.store.loadHistory(),
      this.store.loadEarningsBetween(lastMonthStart, thisMonthStart),
    ]);
    const firstSeen = partners.filter((p) => !states.get(p.agent.id)?.lastEvaluatedAt).map((p) => p.agent.id);
    const historic = await this.store.loadHistoricEarnings(firstSeen);

    for (const partner of partners) {
      try {
        await this.evaluatePartner(partner, {
          now,
          dryRun: report.dryRun,
          prev: states.get(partner.agent.id) ?? null,
          rows: history.get(partner.agent.id) ?? [],
          lastMonthEarnings: lastMonth.get(partner.agent.id) ?? 0,
          historicEarnings: historic.get(partner.agent.id) ?? 0,
          report,
        });
        report.partnersEvaluated++;
      } catch (error) {
        this.logger.error(`Lifecycle evaluation failed for ${partner.agent.agentCode}: ${error?.message}`, error?.stack);
        report.errors.push({ agentCode: partner.agent.agentCode, error: error?.message || String(error) });
      }
    }

    report.finishedAt = new Date();
    const sent = report.emails.filter((e) => e.outcome === 'sent').length;
    this.logger.log(
      `Lifecycle ${report.dryRun ? 'dry run' : 'run'} (${report.trigger}): ${report.partnersEvaluated} partners, ` +
        `${report.dryRun ? report.emails.filter((e) => e.outcome === 'would_send').length + ' would send' : sent + ' sent'}, ` +
        `${report.errors.length} errors`,
    );
    return report;
  }

  private async evaluatePartner(
    partner: PartnerRecord,
    ctx: {
      now: Date;
      dryRun: boolean;
      prev: StoredState | null;
      rows: HistoryRow[];
      lastMonthEarnings: number;
      historicEarnings: number;
      report: RunReport;
    },
  ): Promise<void> {
    const { agent, user } = partner;
    const { now, dryRun, prev, report } = ctx;
    const eligibility = eligibilityOf(user, agent, prev);

    const snapshot: PartnerSnapshot = {
      agentId: agent.id,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      agentCode: agent.agentCode,
      activatedAt: agent.activatedAt ?? agent.createdAt,
      lastLoginAt: user.lastLoginAt ?? null,
      totalReferrals: Number(agent.totalReferrals) || 0,
      commissionEarnings: commissionEarningsOf(agent),
      lastMonthEarnings: ctx.lastMonthEarnings,
      historicEarnings: ctx.historicEarnings,
      eligible: eligibility.eligible,
      ineligibleReason: eligibility.reason,
    };

    // A state row the job never evaluated (e.g. created by an early unsubscribe) has no
    // baselines yet, so it is bootstrapped like a partner seen for the first time.
    const observed = observe(snapshot, prev?.lastEvaluatedAt ? prev : null, now);
    if (observed.bootstrapped) report.partnersFirstSeen++;
    const state: StoredState = {
      ...observed.state,
      agentId: agent.id,
      userId: user.id,
      unsubscribedAt: prev?.unsubscribedAt ?? null,
      unsubscribeSource: prev?.unsubscribeSource ?? null,
      lastEvaluatedAt: now,
    };

    const rows = [...ctx.rows];
    const history: History = new Map(
      rows.map((r) => [r.dedupeKey, { status: r.status, at: r.sentAt ?? r.createdAt, attempts: r.attempts }]),
    );

    // Self-heal: if a crash lost the "track started" stamp, recover it from the send log.
    const inactive30 = history.get(`inactive_30:c${state.inactiveCycle}`);
    if (!state.inactiveTrackStartedAt && !state.quietAt && inactive30?.status === 'sent') {
      state.inactiveTrackStartedAt = inactive30.at;
    }

    if (observed.newReferral && !dryRun) {
      await this.store.markConversions(
        agent.id,
        REFERRAL_CONVERSION_SEGMENTS,
        'referral',
        new Date(now.getTime() - this.config.attributionDays * DAY_MS),
        now,
      );
    }

    const decision = decide(snapshot, state, history, now, this.config);

    for (const s of decision.suppressions) {
      report.suppressed.push({ agentCode: agent.agentCode, dedupeKey: s.dedupeKey, reason: s.reason });
      if (!dryRun) {
        await this.store.recordSuppressed({
          agentId: agent.id,
          userId: user.id,
          templateKey: s.templateKey,
          dedupeKey: s.dedupeKey,
          segment: s.segment,
          reason: s.reason,
        });
      }
    }

    const capCutoff = now.getTime() - DAILY_CAP_WINDOW_MS;
    let budget =
      this.config.maxEmailsPerPartnerPerDay -
      rows.filter((r) => r.status === 'sent' && r.segment !== 'internal' && r.sentAt && r.sentAt.getTime() >= capCutoff).length;
    let welcomeBackDeferred = false;

    for (const candidate of decision.candidates) {
      const template = getLifecycleTemplate(candidate.templateKey);
      if (!template || template.managedElsewhere) continue;

      const data = this.templateData(partner, candidate);
      const subject = renderText(template.subject, data);
      let outcome: EmailOutcome;
      let error: string | undefined;

      if (!candidate.internal && budget <= 0) {
        outcome = 'deferred_daily_cap';
      } else if (template.draft && !this.config.allowDraftCopy) {
        outcome = 'blocked_draft_copy';
      } else if (!candidate.internal && !isRecipientAllowed(user.email, this.config.recipientAllowlist)) {
        outcome = 'blocked_allowlist';
      } else if (dryRun) {
        outcome = 'would_send';
      } else {
        ({ outcome, error } = await this.deliver(partner, candidate, template, data, subject, now));
      }

      if ((outcome === 'sent' || outcome === 'would_send') && !candidate.internal) budget--;
      if (candidate.templateKey === 'welcome_back' && outcome === 'deferred_daily_cap') welcomeBackDeferred = true;

      if (outcome === 'sent') {
        rows.push({
          id: '',
          dedupeKey: candidate.dedupeKey,
          templateKey: candidate.templateKey,
          segment: candidate.segment,
          status: 'sent',
          sentAt: now,
          createdAt: now,
          attempts: 1,
        });
        if (candidate.templateKey === 'inactive_30' && !state.inactiveTrackStartedAt) {
          state.inactiveTrackStartedAt = now;
        }
        for (const lower of candidate.supersedes ?? []) {
          await this.store.recordSuppressed({
            agentId: agent.id,
            userId: user.id,
            templateKey: lower.templateKey,
            dedupeKey: lower.dedupeKey,
            segment: lower.segment,
            reason: `superseded_by:${candidate.dedupeKey}`,
          });
        }
      }

      report.emails.push({
        agentId: agent.id,
        agentCode: agent.agentCode,
        partnerName: `${user.firstName} ${user.lastName}`.trim(),
        email: candidate.internal ? this.config.partnerTeamEmails.join(', ') : user.email,
        templateKey: candidate.templateKey,
        dedupeKey: candidate.dedupeKey,
        segment: candidate.segment,
        subject,
        outcome,
        ...(error ? { error } : {}),
      });
      const bucket = (report.summary[candidate.templateKey] ??= {});
      bucket[outcome] = (bucket[outcome] ?? 0) + 1;
    }

    // Leave the inactive track only once the welcome-back email is not merely waiting
    // on today's cap; otherwise the transition would erase the reason to send it.
    if (decision.transitions.welcomeBack && !welcomeBackDeferred) {
      if (!dryRun) {
        await this.store.markConversions(
          agent.id,
          ['inactive'],
          'reactivated',
          new Date(now.getTime() - this.config.attributionDays * DAY_MS),
          now,
        );
      }
      state.inactiveCycle += 1;
      state.inactiveTrackStartedAt = null;
      state.quietAt = null;
      report.transitions.welcomeBack.push(agent.agentCode);
    }
    if (decision.transitions.enterQuiet) {
      state.quietAt = now;
      state.inactiveTrackStartedAt = null;
      report.transitions.enteredQuiet.push(agent.agentCode);
    }

    if (!dryRun) await this.store.saveState(state);
  }

  private async deliver(
    partner: PartnerRecord,
    candidate: Candidate,
    template: LifecycleTemplate,
    data: LifecycleTemplateData,
    subject: string,
    now: Date,
  ): Promise<{ outcome: EmailOutcome; error?: string }> {
    const { agent, user } = partner;
    const recipients = candidate.internal ? this.config.partnerTeamEmails : [user.email];

    const emailId = await this.store.claim(
      {
        agentId: agent.id,
        userId: user.id,
        templateKey: candidate.templateKey,
        dedupeKey: candidate.dedupeKey,
        segment: candidate.segment,
        recipient: recipients.join(', ').slice(0, 255),
        subject: subject.slice(0, 255),
        context: { data },
      },
      this.config.maxSendAttempts,
    );
    if (!emailId) return { outcome: 'already_claimed' };

    try {
      const unsubscribeUrl = candidate.internal ? undefined : this.unsubscribeUrl(agent.id, emailId);
      const portal = this.emailService.getPartnerPortalBaseUrl();
      const templateData = {
        ...data,
        draft: template.draft,
        paragraphs: template.paragraphs.map((p) => renderText(p, data)),
        ctaText: template.cta?.text,
        ctaUrl: template.cta ? ctaUrl(template.cta.target, portal) : undefined,
        showReferralBox: !candidate.internal && template.cta?.target === 'referral',
        unsubscribeLink: unsubscribeUrl,
      };

      let lastResult: { success: boolean; messageId?: string; simulated?: boolean; error?: string } = { success: false };
      let anySuccess = false;
      for (const to of recipients) {
        lastResult = await this.emailService.sendEmailWithResult({
          to,
          subject,
          template: 'lifecycle',
          templateData,
          previewText: renderText(template.previewText, data),
          mailgun: candidate.internal
            ? { tags: ['partner-lifecycle-internal', `lifecycle-${candidate.templateKey}`] }
            : {
                tags: ['partner-lifecycle', `lifecycle-${candidate.templateKey}`, `lifecycle-segment-${candidate.segment}`],
                trackOpens: true,
                trackClicks: true,
                variables: { lifecycle_email_id: emailId, lifecycle_template: candidate.templateKey },
                headers: {
                  'List-Unsubscribe': `<${unsubscribeUrl}>`,
                  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
              },
        });
        anySuccess = anySuccess || lastResult.success;
      }

      if (anySuccess) {
        await this.store.markSent(emailId, { messageId: lastResult.messageId, simulated: lastResult.simulated, at: now });
        return { outcome: 'sent' };
      }
      await this.store.markFailed(emailId, lastResult.error || 'Send failed');
      return { outcome: 'failed', error: lastResult.error };
    } catch (error) {
      const message = error?.message || String(error);
      await this.store.markFailed(emailId, message);
      return { outcome: 'failed', error: message };
    }
  }

  private templateData(partner: PartnerRecord, candidate: Candidate): LifecycleTemplateData {
    const portal = this.emailService.getPartnerPortalBaseUrl();
    return {
      firstName: partner.user.firstName,
      agentCode: partner.agent.agentCode,
      referralLink: `${portal}/referral/${encodeURIComponent(partner.agent.agentCode)}`,
      portalUrl: portal,
      partnerName: `${partner.user.firstName} ${partner.user.lastName}`.trim(),
      partnerEmail: partner.user.email,
      ...candidate.data,
    };
  }

  unsubscribeUrl(agentId: string, emailId?: string): string {
    const token = signUnsubscribeToken(agentId, this.config.unsubscribeSecret);
    const params = new URLSearchParams({ agent: agentId, token });
    if (emailId) params.set('e', emailId);
    return `${this.config.publicApiUrl}/lifecycle-emails/unsubscribe?${params.toString()}`;
  }
}

function renderText(source: string, data: Record<string, any>): string {
  // noEscape: these strings are escaped once, by the HTML layout, when inserted.
  return Handlebars.compile(source, { noEscape: true })(data);
}

function ctaUrl(target: CtaTarget, portal: string): string {
  switch (target) {
    case 'support':
      return 'mailto:partners@planettalk.com';
    // The partner portal has a single dashboard page with the code, link, referrals and earnings.
    default:
      return `${portal}/dashboard`;
  }
}
