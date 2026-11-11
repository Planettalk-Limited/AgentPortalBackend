/**
 * Pure shaping for the lifecycle dashboard's partner measures: groups, referral
 * milestones and monthly comebacks. LifecycleTrackingService runs the queries.
 */
import {
  GroupInput,
  PARTNER_GROUPS,
  PARTNER_GROUP_DEFINITIONS,
  PartnerGroup,
  classifyPartner,
  localDateString,
} from './lifecycle.rules';

export interface GroupSummary {
  group: PartnerGroup;
  count: number;
  definition: string;
}

export function summarizeGroups(partners: GroupInput[], now: Date): GroupSummary[] {
  const counts = new Map<PartnerGroup, number>(PARTNER_GROUPS.map((g) => [g, 0]));
  for (const p of partners) {
    const g = classifyPartner(p, now);
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return PARTNER_GROUPS.map((group) => ({
    group,
    count: counts.get(group) ?? 0,
    definition: PARTNER_GROUP_DEFINITIONS[group],
  }));
}

export interface MilestoneSummary {
  milestone: number;
  /** Partners whose referral count has ever reached the milestone (includes pre-tracking history). */
  reached: number;
  /** Crossings the daily run saw in the selected range (only since tracking began). */
  newInRange: number;
}

export function summarizeMilestones(
  milestones: number[],
  highWaters: number[],
  crossings: { value: number; count: number }[],
): MilestoneSummary[] {
  return milestones.map((milestone) => ({
    milestone,
    reached: highWaters.filter((h) => h >= milestone).length,
    newInRange: crossings
      .filter((c) => c.value === milestone)
      .reduce((sum, c) => sum + c.count, 0),
  }));
}

/** The last `count` calendar months (YYYY-MM) in the time zone, oldest first. */
export function lastMonths(now: Date, count: number, timeZone: string): string[] {
  const [y, m] = localDateString(now, timeZone).split('-').map(Number);
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const index = y * 12 + (m - 1) - i;
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    months.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return months;
}

export const COMEBACK_EMAILS = ['inactive_30', 'inactive_60', 'inactive_90'] as const;

export interface ComebackMonth {
  month: string;
  total: number;
  /** Last re-engagement email sent before the comeback; `none` = came back with no email. */
  byLastEmail: Record<(typeof COMEBACK_EMAILS)[number] | 'none', number>;
}

export function shapeComebacks(
  months: string[],
  rows: { month: string; lastEmail: string | null; count: number }[],
): ComebackMonth[] {
  return months.map((month) => {
    const byLastEmail: ComebackMonth['byLastEmail'] = { inactive_30: 0, inactive_60: 0, inactive_90: 0, none: 0 };
    let total = 0;
    for (const r of rows) {
      if (r.month !== month) continue;
      const key = (COMEBACK_EMAILS as readonly string[]).includes(r.lastEmail ?? '')
        ? (r.lastEmail as (typeof COMEBACK_EMAILS)[number])
        : 'none';
      byLastEmail[key] += r.count;
      total += r.count;
    }
    return { month, total, byLastEmail };
  });
}
