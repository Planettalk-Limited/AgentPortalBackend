/**
 * Runtime settings for the partner lifecycle emails, all read from env vars so ops
 * can tune them without a deploy. Every value has a safe default; the master
 * switch defaults to OFF so merging this code sends nothing until someone opts in.
 */
export interface LifecycleConfig {
  /** Master switch. When false the scheduled run is not registered and the admin "run" endpoint refuses to send. */
  enabled: boolean;
  cron: string;
  timeZone: string;
  /** Lifetime commission thresholds (USD) for "You've earned $X" emails. */
  earningsThresholds: number[];
  /** Referral counts that trigger a milestone email. */
  referralMilestones: number[];
  /** Day-N emails still go out up to this many days late (covers a missed daily run), never earlier. */
  catchUpDays: number;
  /** Partner-facing lifecycle emails per partner per rolling 20h. Internal team alerts are not counted. */
  maxEmailsPerPartnerPerDay: number;
  /** A referral / reactivation within this many days of an email counts as a conversion for it. */
  attributionDays: number;
  /** Day of month from which the "active partner" monthly email may go out (keeps it apart from the earnings summary). */
  activeMonthlyFromDay: number;
  /** Who hears about a partner's 100th referral. */
  partnerTeamEmails: string[];
  /** Templates still flagged draft are only sent when this is true (lets staging test the placeholder copy). */
  allowDraftCopy: boolean;
  /** If non-empty, only these addresses (or @domains) are emailed. For staging / client review. */
  recipientAllowlist: string[];
  unsubscribeSecret: string;
  publicApiUrl: string;
  mailgunWebhookSigningKey: string;
  /** Failed sends are retried on later runs until this many attempts. */
  maxSendAttempts: number;
}

type EnvGetter = (key: string) => string | undefined;

const DEFAULT_PARTNER_TEAM = ['partners@planettalk.com'];

export function parseNumberList(raw: string | undefined, fallback: number[]): number[] {
  if (!raw || !raw.trim()) return fallback;
  const values = raw
    .split(/[,;\s]+/)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);
  return values.length ? Array.from(new Set(values)).sort((a, b) => a - b) : fallback;
}

function parseList(raw: string | undefined): string[] {
  return (raw || '')
    .split(/[,;\s]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function parseIntOr(raw: string | undefined, fallback: number, min = 0): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

export function loadLifecycleConfig(get: EnvGetter): LifecycleConfig {
  const apiPrefix = get('API_PREFIX') || 'api/v1';
  const defaultApiUrl =
    get('NODE_ENV') === 'production'
      ? `https://api.planettalk.com/${apiPrefix}`
      : `http://localhost:${get('PORT') || 3000}/${apiPrefix}`;

  const team = parseList(get('LIFECYCLE_PARTNER_TEAM_EMAILS'));
  const fallbackTeam = parseList(get('ADMIN_BUSINESS_APPLICATION_EMAILS'));

  return {
    enabled: parseBool(get('LIFECYCLE_EMAILS_ENABLED'), false),
    cron: get('LIFECYCLE_EMAILS_CRON') || '0 9 * * *',
    timeZone: get('LIFECYCLE_EMAILS_TIMEZONE') || 'Europe/London',
    earningsThresholds: parseNumberList(get('LIFECYCLE_EARNINGS_THRESHOLDS'), [50, 100, 250]),
    referralMilestones: parseNumberList(get('LIFECYCLE_REFERRAL_MILESTONES'), [1, 5, 10, 25, 50, 100]),
    catchUpDays: parseIntOr(get('LIFECYCLE_CATCH_UP_DAYS'), 3, 1),
    maxEmailsPerPartnerPerDay: parseIntOr(get('LIFECYCLE_MAX_EMAILS_PER_PARTNER_PER_DAY'), 1, 1),
    attributionDays: parseIntOr(get('LIFECYCLE_ATTRIBUTION_DAYS'), 30, 1),
    activeMonthlyFromDay: Math.min(parseIntOr(get('LIFECYCLE_ACTIVE_MONTHLY_FROM_DAY'), 15, 1), 28),
    partnerTeamEmails: team.length ? team : fallbackTeam.length ? fallbackTeam : DEFAULT_PARTNER_TEAM,
    allowDraftCopy: parseBool(get('LIFECYCLE_ALLOW_DRAFT_COPY'), false),
    recipientAllowlist: parseList(get('LIFECYCLE_RECIPIENT_ALLOWLIST')),
    unsubscribeSecret: get('LIFECYCLE_UNSUBSCRIBE_SECRET') || get('JWT_SECRET') || '',
    publicApiUrl: (get('LIFECYCLE_PUBLIC_API_URL') || defaultApiUrl).replace(/\/+$/, ''),
    mailgunWebhookSigningKey: get('MAILGUN_WEBHOOK_SIGNING_KEY') || '',
    maxSendAttempts: parseIntOr(get('LIFECYCLE_MAX_SEND_ATTEMPTS'), 3, 1),
  };
}

export function isRecipientAllowed(email: string, allowlist: string[]): boolean {
  if (!allowlist.length) return true;
  const lower = (email || '').toLowerCase();
  return allowlist.some((entry) =>
    entry.startsWith('@') ? lower.endsWith(entry) : lower === entry,
  );
}
