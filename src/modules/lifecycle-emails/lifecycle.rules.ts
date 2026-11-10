/**
 * Pure decision logic for the partner lifecycle emails: no database, no Mailgun.
 * LifecycleEmailsService loads the data, calls observe() then decide(), and acts
 * on the result. Keeping this pure is what lets the specs pin every rule down.
 *
 * Two facts about the data shape these rules:
 *
 *  1. Referral counts and earnings are NOT live. They arrive through the admin
 *     bulk CSV upload, which overwrites agents.totalReferrals / totalEarnings.
 *     There are no per-referral rows for uploaded referrals and no top-up data at
 *     all, so "a new referral happened" can only be detected as "the count went up
 *     since we last looked". observe() keeps a high-water mark per partner for that.
 *
 *  2. Uploads can be wrong (4 Nov 2026: 24 partners' totals set to 0, then
 *     restored). Milestones therefore key off the HIGH-WATER mark, never the live
 *     value, and every once-only email has a unique row in the send log. A total
 *     that drops and comes back never looks like a new crossing.
 */
import { LifecycleConfig } from './lifecycle.config';
import { LifecycleSegment, LifecycleTemplateData } from './lifecycle-templates';
import { WELCOME_CREDIT_AMOUNT } from '../agents/agents.constants';

const DAY_MS = 24 * 60 * 60 * 1000;
const EPSILON = 0.005;

export type SendStatus = 'pending' | 'sent' | 'failed' | 'suppressed';

export interface PartnerSnapshot {
  agentId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  agentCode: string;
  /** When the partner's programme started: agents.activatedAt, else agents.createdAt. */
  activatedAt: Date;
  lastLoginAt: Date | null;
  totalReferrals: number;
  /** Commission only (welcome credit excluded), see commissionEarningsOf(). */
  commissionEarnings: number;
  /** Earnings recorded for the previous calendar month (0 if none). */
  lastMonthEarnings: number;
  /** Sum of the partner's earning records; only used when first seeing a partner. */
  historicEarnings: number;
  eligible: boolean;
  ineligibleReason?: string;
}

export interface LifecycleStateView {
  trackingStartedAt: Date;
  referralBaseline: number;
  referralHighWater: number;
  lastReferralAt: Date | null;
  /** null = partner looked zeroed by a bad upload when first seen; set by the next positive upload. */
  earningsBaseline: number | null;
  earningsHighWater: number;
  lastEarningsIncreaseAt: Date | null;
  inactiveCycle: number;
  inactiveTrackStartedAt: Date | null;
  quietAt: Date | null;
  unsubscribedAt: Date | null;
}

export interface HistoryEntry {
  status: SendStatus;
  at: Date;
  attempts: number;
}

/** Send-log rows for one partner, keyed by dedupe key. */
export type History = Map<string, HistoryEntry>;

export interface ObserveResult {
  state: LifecycleStateView;
  bootstrapped: boolean;
  newReferral: boolean;
  earningsIncreased: boolean;
  earningsRestored: boolean;
}

export interface Candidate {
  templateKey: string;
  dedupeKey: string;
  segment: LifecycleSegment;
  priority: number;
  data: Partial<LifecycleTemplateData>;
  /** Partner-team notification: bypasses the partner's daily cap and opt-out. */
  internal?: boolean;
  /** Dedupe keys to record as suppressed once this candidate is sent (lower milestones it supersedes). */
  supersedes?: { dedupeKey: string; templateKey: string; segment: LifecycleSegment }[];
}

export interface Suppression {
  dedupeKey: string;
  templateKey: string;
  segment: LifecycleSegment;
  reason: string;
}

export interface Decision {
  candidates: Candidate[];
  /** Emails that will never be sent, recorded so they cannot fire later. */
  suppressions: Suppression[];
  transitions: { welcomeBack: boolean; enterQuiet: boolean };
}

export interface LocalClock {
  /** Local calendar date (in the configured time zone) as YYYY-MM-DD. */
  date: string;
  dayOfMonth: number;
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number;
  yearMonth: string;
  previousYearMonth: string;
  previousMonthName: string;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function localDateString(at: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function buildLocalClock(now: Date, timeZone: string): LocalClock {
  const date = localDateString(now, timeZone);
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const prevMonthIndex = (m + 10) % 12; // 0-based index of previous month
  const prevYear = m === 1 ? y - 1 : y;
  return {
    date,
    dayOfMonth: d,
    weekday,
    yearMonth: `${y}-${String(m).padStart(2, '0')}`,
    previousYearMonth: `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}`,
    previousMonthName: MONTH_NAMES[prevMonthIndex],
  };
}

/** Whole calendar days from `from` to `to`, counted in the given time zone (Day 0 = same date). */
export function calendarDaysBetween(from: Date, to: Date, timeZone: string): number {
  const a = Date.parse(`${localDateString(from, timeZone)}T00:00:00Z`);
  const b = Date.parse(`${localDateString(to, timeZone)}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

function addMonths(at: Date, months: number): Date {
  const d = new Date(at.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function latest(...dates: (Date | null | undefined)[]): Date {
  return dates
    .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
    .reduce((a, b) => (b > a ? b : a));
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

/**
 * Commission earnings, excluding the $3 welcome credit.
 *
 * Activation adds the welcome credit to agents.totalEarnings, but the first bulk
 * upload overwrites totalEarnings with the billing system's figure, which has never
 * heard of the credit. So before any upload the credit must be subtracted; after
 * one, the stored figure is already commission only.
 */
export function commissionEarningsOf(agent: {
  totalEarnings: number | string | null;
  metadata?: Record<string, any> | null;
}): number {
  const total = Number(agent.totalEarnings) || 0;
  if (agent.metadata?.lastDataUpload) return round2(total);
  const credit = agent.metadata?.welcomeCreditAwardedAt
    ? Number(agent.metadata?.welcomeCreditAmount ?? WELCOME_CREDIT_AMOUNT) || 0
    : 0;
  return Math.max(0, round2(total - credit));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Who may receive partner-facing lifecycle emails at all. */
export function eligibilityOf(
  user: { role: string; status: string; emailVerifiedAt: Date | null; metadata?: Record<string, any> | null },
  agent: { status: string },
  state: { unsubscribedAt: Date | null } | null,
): { eligible: boolean; reason?: string } {
  if (user.role !== 'agent') return { eligible: false, reason: 'not_a_partner' };
  if (user.status !== 'active') return { eligible: false, reason: 'user_not_active' };
  if (!user.emailVerifiedAt) return { eligible: false, reason: 'email_not_verified' };
  if (agent.status !== 'active') return { eligible: false, reason: 'partner_not_active' };
  if (state?.unsubscribedAt) return { eligible: false, reason: 'unsubscribed' };
  if (user.metadata?.emailNotifications === false) return { eligible: false, reason: 'email_notifications_off' };
  return { eligible: true };
}

// ─── observe(): update the per-partner state from the latest figures ─────────

export function observe(
  snapshot: PartnerSnapshot,
  prev: LifecycleStateView | null,
  now: Date,
): ObserveResult {
  const referrals = Math.max(0, Math.floor(Number(snapshot.totalReferrals) || 0));
  const earnings = Math.max(0, Number(snapshot.commissionEarnings) || 0);

  if (!prev) {
    // First time we see this partner: whatever they already have is the baseline,
    // so go-live never congratulates existing partners on old milestones.
    // A partner showing $0 but with earning records was very likely zeroed by a bad
    // upload (4 Nov 2026); leave their baseline open so the restoring upload is
    // absorbed silently instead of looking like a first commission.
    const looksZeroed = earnings < EPSILON && (Number(snapshot.historicEarnings) || 0) >= 0.01;
    return {
      bootstrapped: true,
      newReferral: false,
      earningsIncreased: false,
      earningsRestored: false,
      state: {
        trackingStartedAt: now,
        referralBaseline: referrals,
        referralHighWater: referrals,
        lastReferralAt: null,
        earningsBaseline: looksZeroed ? null : earnings,
        earningsHighWater: earnings,
        lastEarningsIncreaseAt: null,
        inactiveCycle: 0,
        inactiveTrackStartedAt: null,
        quietAt: null,
        unsubscribedAt: null,
      },
    };
  }

  const state: LifecycleStateView = { ...prev };
  let newReferral = false;
  let earningsIncreased = false;
  let earningsRestored = false;

  if (referrals > prev.referralHighWater) {
    state.referralHighWater = referrals;
    state.lastReferralAt = now;
    newReferral = true;
  }

  if (prev.earningsBaseline === null) {
    if (earnings >= 0.01) {
      state.earningsBaseline = Math.max(earnings, prev.earningsHighWater);
      state.earningsHighWater = Math.max(earnings, prev.earningsHighWater);
      earningsRestored = true;
    }
  } else if (earnings > prev.earningsHighWater + EPSILON) {
    state.earningsHighWater = earnings;
    state.lastEarningsIncreaseAt = now;
    earningsIncreased = true;
  }

  return { state, bootstrapped: false, newReferral, earningsIncreased, earningsRestored };
}

// ─── decide(): which emails are due today ─────────────────────────────────────

export const PRIORITY = {
  welcome_back: 10,
  referral_milestone: 20,
  earnings_first: 30,
  earnings_threshold: 31,
  earnings_summary: 40,
  anniversary: 50,
  onboarding: 60,
  lapsed: 70,
  inactive: 80,
  active_monthly: 90,
} as const;

const ONBOARDING_STEPS: { day: number; key: string; when: 'all' | 'never_logged_in' | 'no_referral' }[] = [
  { day: 3, key: 'onboarding_day3', when: 'all' },
  { day: 6, key: 'onboarding_day6', when: 'never_logged_in' },
  { day: 10, key: 'onboarding_day10', when: 'no_referral' },
  { day: 14, key: 'onboarding_day14', when: 'no_referral' },
  { day: 21, key: 'onboarding_day21', when: 'no_referral' },
];

export const INACTIVE_DAYS = [30, 60, 90] as const;
export const QUIET_AFTER_FINAL_DAYS = 10;
export const LAPSED_DAYS = [21, 60] as const;

export function decide(
  snapshot: PartnerSnapshot,
  state: LifecycleStateView,
  history: History,
  now: Date,
  config: Pick<
    LifecycleConfig,
    'timeZone' | 'earningsThresholds' | 'referralMilestones' | 'catchUpDays' | 'activeMonthlyFromDay' | 'maxSendAttempts'
  >,
): Decision {
  const tz = config.timeZone;
  const clock = buildLocalClock(now, tz);
  const days = (from: Date) => calendarDaysBetween(from, now, tz);

  const candidates: Candidate[] = [];
  const suppressions: Suppression[] = [];
  const transitions = { welcomeBack: false, enterQuiet: false };

  /** Done = will never be (re)sent: sent, suppressed, in flight, or out of retries. */
  const isDone = (key: string) => {
    const h = history.get(key);
    if (!h) return false;
    return h.status !== 'failed' || h.attempts >= config.maxSendAttempts;
  };
  const doneAt = (key: string) => (isDone(key) ? history.get(key)!.at : null);
  const add = (c: Candidate) => {
    if (!isDone(c.dedupeKey)) candidates.push(c);
  };

  const lastActivity = latest(snapshot.lastLoginAt, state.lastReferralAt, snapshot.activatedAt, state.trackingStartedAt);
  const cycle = state.inactiveCycle;

  // ── Welcome back: left the inactive track or the quiet list by logging in or referring.
  const trackStart = state.inactiveTrackStartedAt ?? state.quietAt;
  const cameBack =
    !!trackStart &&
    ((!!snapshot.lastLoginAt && snapshot.lastLoginAt > trackStart) ||
      (!!state.lastReferralAt && state.lastReferralAt > trackStart));
  if (cameBack) {
    transitions.welcomeBack = true;
    add({
      templateKey: 'welcome_back',
      dedupeKey: `welcome_back:c${cycle}`,
      segment: 'inactive',
      priority: PRIORITY.welcome_back,
      data: {},
    });
  }

  const quiet = !!state.quietAt && !cameBack;
  if (quiet) {
    // Quiet list: no lifecycle emails until the partner logs in or refers again.
    return finalize();
  }

  // ── Referral milestones (on the high-water mark; highest newly reached only).
  const milestoneKeys = config.referralMilestones.map((m) => `referrals_${m}`);
  const highestRecorded = Math.max(
    0,
    ...config.referralMilestones.filter((m) => isDone(`referrals_${m}`)),
  );
  const dueMilestones = config.referralMilestones.filter(
    (m) =>
      m > state.referralBaseline &&
      state.referralHighWater >= m &&
      m > highestRecorded &&
      !isDone(`referrals_${m}`),
  );
  if (dueMilestones.length) {
    const top = Math.max(...dueMilestones);
    add({
      templateKey: `referrals_${top}`,
      dedupeKey: `referrals_${top}`,
      segment: 'referral_milestone',
      priority: PRIORITY.referral_milestone,
      data: { milestone: top },
      supersedes: dueMilestones
        .filter((m) => m !== top)
        .map((m) => ({ dedupeKey: `referrals_${m}`, templateKey: `referrals_${m}`, segment: 'referral_milestone' as const })),
    });
  }
  // The 100th referral also needs a personal message from the partner team.
  if (state.referralHighWater >= 100 && state.referralBaseline < 100 && milestoneKeys.includes('referrals_100')) {
    add({
      templateKey: 'referrals_100_team',
      dedupeKey: 'referrals_100_team',
      segment: 'internal',
      priority: PRIORITY.referral_milestone,
      internal: true,
      data: {},
    });
  }

  // ── Earnings milestones (never while the baseline is waiting for a restore upload).
  if (state.earningsBaseline !== null) {
    if (state.earningsBaseline < 0.01 && state.earningsHighWater >= 0.01) {
      add({
        templateKey: 'earnings_first',
        dedupeKey: 'earnings_first',
        segment: 'earnings',
        priority: PRIORITY.earnings_first,
        data: {},
      });
    }

    const highestThresholdRecorded = Math.max(
      0,
      ...config.earningsThresholds.filter((t) => isDone(`earnings_${t}`)),
    );
    const dueThresholds = config.earningsThresholds.filter(
      (t) =>
        t > state.earningsBaseline! &&
        state.earningsHighWater + EPSILON >= t &&
        t > highestThresholdRecorded &&
        !isDone(`earnings_${t}`),
    );
    if (dueThresholds.length) {
      const top = Math.max(...dueThresholds);
      add({
        templateKey: `earnings_${top}`,
        dedupeKey: `earnings_${top}`,
        segment: 'earnings',
        priority: PRIORITY.earnings_threshold,
        data: { amount: formatAmount(top) },
        supersedes: dueThresholds
          .filter((t) => t !== top)
          .map((t) => ({ dedupeKey: `earnings_${t}`, templateKey: `earnings_${t}`, segment: 'earnings' as const })),
      });
    }
  }

  // ── Monthly earnings summary: first working week (weekday, day 1-7), if earned last month.
  const isWeekday = clock.weekday >= 1 && clock.weekday <= 5;
  if (clock.dayOfMonth <= 7 && isWeekday && snapshot.lastMonthEarnings >= 0.01) {
    add({
      templateKey: 'earnings_summary',
      dedupeKey: `earnings_summary:${clock.previousYearMonth}`,
      segment: 'earnings',
      priority: PRIORITY.earnings_summary,
      data: { month: clock.previousMonthName, amount: snapshot.lastMonthEarnings.toFixed(2) },
    });
  }

  // ── Anniversaries (need at least one referral).
  if (state.referralHighWater >= 1) {
    for (const [months, key, period] of [
      [6, 'anniversary_6m', '6 months'],
      [12, 'anniversary_12m', 'year'],
    ] as const) {
      const since = days(addMonths(snapshot.activatedAt, months));
      if (since >= 0 && since < config.catchUpDays) {
        add({ templateKey: key, dedupeKey: key, segment: 'active', priority: PRIORITY.anniversary, data: { period } });
      }
    }
  }

  // ── Onboarding (Day N after activation; up to catchUpDays late, never back-filled).
  const sinceActivation = days(snapshot.activatedAt);
  const hasReferral = state.referralHighWater >= 1 || snapshot.totalReferrals >= 1;
  for (const step of ONBOARDING_STEPS) {
    if (sinceActivation < step.day || sinceActivation >= step.day + config.catchUpDays) continue;
    if (step.when === 'never_logged_in' && snapshot.lastLoginAt) continue;
    if (step.when === 'no_referral' && hasReferral) continue;
    add({ templateKey: step.key, dedupeKey: step.key, segment: 'onboarding', priority: PRIORITY.onboarding, data: {} });
  }

  // ── Previously active: had a referral, none new for 21 / 60 days.
  // When the referral date is unknown (partner predates tracking) the clock starts at tracking start.
  if (state.referralHighWater >= 1 && !cameBack) {
    const anchor = latest(state.lastReferralAt, state.trackingStartedAt);
    const anchorKey = localDateString(anchor, tz);
    const since = days(anchor);
    const key21 = `lapsed_21:${anchorKey}`;
    const key60 = `lapsed_60:${anchorKey}`;

    if (since >= 60 && !isDone(key60)) {
      if (state.inactiveTrackStartedAt) {
        // Also not logging in: the inactive re-engagement track already covers them.
        suppressions.push({ dedupeKey: key60, templateKey: 'lapsed_60', segment: 'previously_active', reason: 'superseded_by_inactive_track' });
      } else {
        const sent21 = doneAt(key21);
        if (!sent21 || days(sent21) >= 14) {
          add({
            templateKey: 'lapsed_60',
            dedupeKey: key60,
            segment: 'previously_active',
            priority: PRIORITY.lapsed,
            data: {},
            supersedes: sent21 ? [] : [{ dedupeKey: key21, templateKey: 'lapsed_21', segment: 'previously_active' }],
          });
        }
      }
    } else if (since >= 21 && since < 60) {
      add({ templateKey: 'lapsed_21', dedupeKey: key21, segment: 'previously_active', priority: PRIORITY.lapsed, data: {} });
    }
  }

  // ── Active: commission grew (i.e. referred customers topped up) in the last 30 days.
  // Proxy: there is no top-up data, only upload-to-upload increases in commission.
  if (
    state.lastEarningsIncreaseAt &&
    days(state.lastEarningsIncreaseAt) <= 30 &&
    clock.dayOfMonth >= config.activeMonthlyFromDay
  ) {
    add({
      templateKey: 'active_monthly',
      dedupeKey: `active_monthly:${clock.yearMonth}`,
      segment: 'active',
      priority: PRIORITY.active_monthly,
      data: {},
    });
  }

  // ── Inactive re-engagement: no login AND no new referral for 30 / 60 / 90 days.
  if (!cameBack) {
    const inactiveDays = days(lastActivity);
    const [k30, k60, k90] = INACTIVE_DAYS.map((d) => `inactive_${d}:c${cycle}`);
    const at30 = doneAt(k30);
    const at60 = doneAt(k60);
    const at90 = doneAt(k90);
    const step = (key: string, d: number) =>
      add({ templateKey: `inactive_${d}`, dedupeKey: key, segment: 'inactive', priority: PRIORITY.inactive, data: {} });

    if (!at30) {
      if (inactiveDays >= 30) step(k30, 30);
    } else if (!at60) {
      if (inactiveDays >= 60 && days(at30) >= 30) step(k60, 60);
    } else if (!at90) {
      if (inactiveDays >= 90 && days(at60) >= 30) step(k90, 90);
    } else if (days(at90) >= QUIET_AFTER_FINAL_DAYS) {
      // Any login or referral since the 90-day email would have triggered welcome back above.
      transitions.enterQuiet = true;
    }
  }

  return finalize();

  function finalize(): Decision {
    let out = candidates;
    if (!snapshot.eligible) {
      // Ineligible partners get nothing; the team still hears about a 100th referral
      // from a partner who merely opted out of marketing email.
      out = snapshot.ineligibleReason === 'unsubscribed' || snapshot.ineligibleReason === 'email_notifications_off'
        ? candidates.filter((c) => c.internal)
        : [];
    }
    out.sort((a, b) => a.priority - b.priority);
    return { candidates: out, suppressions, transitions };
  }
}
