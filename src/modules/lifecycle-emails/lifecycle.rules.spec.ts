import { loadLifecycleConfig } from './lifecycle.config';
import {
  History,
  LifecycleStateView,
  PartnerSnapshot,
  calendarDaysBetween,
  commissionEarningsOf,
  decide,
  eligibilityOf,
  observe,
} from './lifecycle.rules';

const DAY = 24 * 60 * 60 * 1000;
// Tuesday 10 Nov 2026, 09:00 in London (GMT, so UTC == local).
const NOW = new Date('2026-11-10T09:00:00Z');
const daysAgo = (n: number, from: Date = NOW) => new Date(from.getTime() - n * DAY);

const config = loadLifecycleConfig(() => undefined);

function snapshot(overrides: Partial<PartnerSnapshot> = {}): PartnerSnapshot {
  return {
    agentId: 'agent-1',
    userId: 'user-1',
    email: 'partner@example.com',
    firstName: 'Ada',
    lastName: 'Partner',
    agentCode: 'PT0001',
    activatedAt: daysAgo(400),
    lastLoginAt: daysAgo(1),
    totalReferrals: 0,
    commissionEarnings: 0,
    lastMonthEarnings: 0,
    historicEarnings: 0,
    eligible: true,
    ...overrides,
  };
}

function state(overrides: Partial<LifecycleStateView> = {}): LifecycleStateView {
  return {
    trackingStartedAt: daysAgo(500),
    referralBaseline: 0,
    referralHighWater: 0,
    lastReferralAt: null,
    earningsBaseline: 0,
    earningsHighWater: 0,
    lastEarningsIncreaseAt: null,
    inactiveCycle: 0,
    inactiveTrackStartedAt: null,
    quietAt: null,
    unsubscribedAt: null,
    ...overrides,
  };
}

function history(entries: Record<string, { status?: any; daysAgo?: number; attempts?: number }> = {}): History {
  return new Map(
    Object.entries(entries).map(([key, e]) => [
      key,
      { status: e.status ?? 'sent', at: daysAgo(e.daysAgo ?? 0), attempts: e.attempts ?? 1 },
    ]),
  );
}

const keysOf = (snap: PartnerSnapshot, st: LifecycleStateView, h: History = new Map(), now = NOW, cfg = config) =>
  decide(snap, st, h, now, cfg).candidates.map((c) => c.dedupeKey);

describe('lifecycle rules', () => {
  describe('onboarding (new partner)', () => {
    const newPartner = (day: number, extra: Partial<PartnerSnapshot> = {}) =>
      snapshot({ activatedAt: daysAgo(day), lastLoginAt: null, ...extra });
    const fresh = (day: number) => state({ trackingStartedAt: daysAgo(day) });

    it('sends the Day 3 email to every new partner, even one who already referred', () => {
      expect(keysOf(newPartner(3, { totalReferrals: 2, lastLoginAt: daysAgo(1) }), fresh(3))).toContain('onboarding_day3');
    });

    it('does not send Day 3 early', () => {
      expect(keysOf(newPartner(2), fresh(2))).not.toContain('onboarding_day3');
    });

    it('sends Day 6 only to partners who never logged in', () => {
      expect(keysOf(newPartner(6), fresh(6))).toContain('onboarding_day6');
      expect(keysOf(newPartner(6, { lastLoginAt: daysAgo(2) }), fresh(6))).not.toContain('onboarding_day6');
    });

    it.each([10, 14, 21])('sends Day %i only while the partner has no referral', (day) => {
      expect(keysOf(newPartner(day), fresh(day))).toContain(`onboarding_day${day}`);
      expect(keysOf(newPartner(day), fresh(day))).toHaveLength(1);
      expect(keysOf(newPartner(day, { totalReferrals: 1 }), state({ trackingStartedAt: daysAgo(day), referralHighWater: 1 })))
        .not.toContain(`onboarding_day${day}`);
    });

    it('catches up a missed run but never back-fills partners who joined before go-live', () => {
      expect(keysOf(newPartner(5), fresh(5))).toContain('onboarding_day3'); // 2 days late, within catch-up
      expect(keysOf(newPartner(6), fresh(6))).not.toContain('onboarding_day3'); // 3 days late: window closed
      expect(keysOf(snapshot({ activatedAt: daysAgo(200), lastLoginAt: null }), state()).some((k) => k.startsWith('onboarding'))).toBe(false);
    });

    it('does not resend an onboarding email already in the log', () => {
      expect(keysOf(newPartner(3), fresh(3), history({ onboarding_day3: {} }))).not.toContain('onboarding_day3');
    });
  });

  describe('referral milestones', () => {
    it('sends the first-referral email when the high-water mark reaches 1', () => {
      const d = decide(snapshot({ totalReferrals: 1 }), state({ referralHighWater: 1 }), new Map(), NOW, config);
      expect(d.candidates[0]).toMatchObject({ dedupeKey: 'referrals_1', segment: 'referral_milestone' });
    });

    it('sends only the highest milestone when an upload jumps past several, superseding the rest', () => {
      const d = decide(snapshot({ totalReferrals: 6 }), state({ referralHighWater: 6 }), new Map(), NOW, config);
      const milestone = d.candidates.find((c) => c.segment === 'referral_milestone')!;
      expect(milestone.dedupeKey).toBe('referrals_5');
      expect(milestone.supersedes!.map((s) => s.dedupeKey)).toEqual(['referrals_1']);
    });

    it('never congratulates a partner on milestones they already had when tracking started', () => {
      const st = state({ referralBaseline: 7, referralHighWater: 9 });
      expect(keysOf(snapshot({ totalReferrals: 9 }), st).filter((k) => k.startsWith('referrals_'))).toEqual([]);
      st.referralHighWater = 10;
      expect(keysOf(snapshot({ totalReferrals: 10 }), st)).toContain('referrals_10');
    });

    it('does not re-send a milestone, or send a lower one after a higher one', () => {
      const st = state({ referralHighWater: 12 });
      expect(keysOf(snapshot({ totalReferrals: 12 }), st, history({ referrals_10: {} })).filter((k) => k.startsWith('referrals_'))).toEqual([]);
    });

    it('retries a failed milestone send until attempts run out', () => {
      const st = state({ referralHighWater: 5 });
      expect(keysOf(snapshot(), st, history({ referrals_5: { status: 'failed', attempts: 1 } }))).toContain('referrals_5');
      expect(keysOf(snapshot(), st, history({ referrals_5: { status: 'failed', attempts: 3 } }))).not.toContain('referrals_5');
    });

    it('asks the partner team for a personal message at 100 referrals', () => {
      const d = decide(snapshot({ totalReferrals: 100 }), state({ referralBaseline: 60, referralHighWater: 100 }), new Map(), NOW, config);
      expect(d.candidates.map((c) => c.dedupeKey)).toEqual(expect.arrayContaining(['referrals_100', 'referrals_100_team']));
      expect(d.candidates.find((c) => c.dedupeKey === 'referrals_100_team')!.internal).toBe(true);
    });
  });

  describe('earnings', () => {
    it('announces the first commission when earnings rise from a zero baseline', () => {
      expect(keysOf(snapshot(), state({ earningsBaseline: 0, earningsHighWater: 12 }))).toContain('earnings_first');
    });

    it('sends nothing while a zeroed partner is waiting for the corrected upload', () => {
      const keys = keysOf(snapshot(), state({ earningsBaseline: null, earningsHighWater: 0 }));
      expect(keys.filter((k) => k.startsWith('earnings'))).toEqual([]);
    });

    it('sends the highest threshold crossed and supersedes lower ones', () => {
      const d = decide(snapshot(), state({ earningsBaseline: 10, earningsHighWater: 120 }), new Map(), NOW, config);
      const t = d.candidates.find((c) => c.dedupeKey === 'earnings_100')!;
      expect(t.data.amount).toBe('100');
      expect(t.supersedes!.map((s) => s.dedupeKey)).toEqual(['earnings_50']);
    });

    it('respects configured thresholds', () => {
      const cfg = loadLifecycleConfig((k) => (k === 'LIFECYCLE_EARNINGS_THRESHOLDS' ? '20, 75' : undefined));
      expect(keysOf(snapshot(), state({ earningsBaseline: 5, earningsHighWater: 30 }), new Map(), NOW, cfg)).toContain('earnings_20');
    });

    it('sends the monthly summary in the first working week only, keyed by the month summarised', () => {
      const snap = snapshot({ lastMonthEarnings: 42.5 });
      const tue3rd = new Date('2026-11-03T09:00:00Z');
      const d = decide(snap, state(), new Map(), tue3rd, config).candidates.find((c) => c.templateKey === 'earnings_summary')!;
      expect(d.dedupeKey).toBe('earnings_summary:2026-10');
      expect(d.data).toEqual({ month: 'October', amount: '42.50' });
      expect(keysOf(snap, state(), new Map(), new Date('2026-11-01T09:00:00Z'))).not.toContain('earnings_summary:2026-10'); // Sunday
      expect(keysOf(snap, state(), new Map(), new Date('2026-11-09T09:00:00Z'))).not.toContain('earnings_summary:2026-10'); // day 9
      expect(keysOf(snapshot({ lastMonthEarnings: 0 }), state(), new Map(), tue3rd)).not.toContain('earnings_summary:2026-10');
    });
  });

  describe('previously active (had a referral, none recently)', () => {
    it("sends \"It's been a while\" 21 days after the last referral", () => {
      const st = state({ referralHighWater: 3, lastReferralAt: daysAgo(21) });
      expect(keysOf(snapshot(), st)).toContain('lapsed_21:2026-10-20');
      expect(keysOf(snapshot(), { ...st, lastReferralAt: daysAgo(20) })).not.toContain('lapsed_21:2026-10-20');
    });

    it('sends the 60-day email after the 21-day one, and starts again after a new referral', () => {
      const st = state({ referralHighWater: 3, lastReferralAt: daysAgo(60) });
      expect(keysOf(snapshot(), st, history({ 'lapsed_21:2026-09-11': { daysAgo: 39 } }))).toContain('lapsed_60:2026-09-11');
      expect(keysOf(snapshot(), { ...st, lastReferralAt: daysAgo(21) })).toContain('lapsed_21:2026-10-20');
    });

    it('lets the inactive track supersede the 60-day email when the partner is not logging in either', () => {
      const st = state({ referralHighWater: 3, lastReferralAt: daysAgo(60), inactiveTrackStartedAt: daysAgo(30) });
      const d = decide(snapshot({ lastLoginAt: daysAgo(80) }), st, history({ 'lapsed_21:2026-09-11': { daysAgo: 39 } }), NOW, config);
      expect(d.candidates.map((c) => c.dedupeKey)).not.toContain('lapsed_60:2026-09-11');
      expect(d.suppressions).toEqual([expect.objectContaining({ dedupeKey: 'lapsed_60:2026-09-11', reason: 'superseded_by_inactive_track' })]);
    });

    it('starts the clock at tracking start for partners whose last referral date is unknown', () => {
      const st = state({ referralHighWater: 3, lastReferralAt: null, trackingStartedAt: daysAgo(10) });
      expect(keysOf(snapshot(), st).some((k) => k.startsWith('lapsed'))).toBe(false);
    });

    it('never applies to partners without a referral', () => {
      expect(keysOf(snapshot(), state({ trackingStartedAt: daysAgo(100) })).some((k) => k.startsWith('lapsed'))).toBe(false);
    });
  });

  describe('active', () => {
    it('sends the monthly "keeping things moving" email when commission grew in the last 30 days', () => {
      const st = state({ referralHighWater: 2, lastEarningsIncreaseAt: daysAgo(10) });
      const mid = new Date('2026-11-16T09:00:00Z');
      expect(keysOf(snapshot(), st, new Map(), mid)).toContain('active_monthly:2026-11');
      expect(keysOf(snapshot(), st, new Map(), NOW)).not.toContain('active_monthly:2026-11'); // before the 15th
      expect(keysOf(snapshot(), { ...st, lastEarningsIncreaseAt: daysAgo(40, mid) }, new Map(), mid)).not.toContain('active_monthly:2026-11');
    });

    it('sends the 6 and 12 month anniversary emails only to partners with a referral', () => {
      const sixMonths = snapshot({ activatedAt: new Date('2026-05-10T12:00:00Z') });
      expect(keysOf(sixMonths, state({ referralHighWater: 1 }))).toContain('anniversary_6m');
      expect(keysOf(sixMonths, state({ referralHighWater: 0 }))).not.toContain('anniversary_6m');
      expect(keysOf(snapshot({ activatedAt: new Date('2025-11-10T12:00:00Z') }), state({ referralHighWater: 1 }))).toContain('anniversary_12m');
    });
  });

  describe('inactive re-engagement and the quiet list', () => {
    const idle = (days: number) => snapshot({ lastLoginAt: daysAgo(days), activatedAt: daysAgo(400) });

    it('sends day 30, 60 and 90 emails in order, 30 days apart', () => {
      expect(keysOf(idle(30), state())).toContain('inactive_30:c0');
      expect(keysOf(idle(29), state())).not.toContain('inactive_30:c0');
      expect(keysOf(idle(60), state({ inactiveTrackStartedAt: daysAgo(30) }), history({ 'inactive_30:c0': { daysAgo: 30 } }))).toContain('inactive_60:c0');
      expect(keysOf(idle(60), state(), history({ 'inactive_30:c0': { daysAgo: 20 } }))).not.toContain('inactive_60:c0');
      expect(
        keysOf(idle(90), state({ inactiveTrackStartedAt: daysAgo(60) }), history({ 'inactive_30:c0': { daysAgo: 60 }, 'inactive_60:c0': { daysAgo: 30 } })),
      ).toContain('inactive_90:c0');
    });

    it('treats a recent referral as activity even without a login', () => {
      expect(keysOf(idle(45), state({ referralHighWater: 1, lastReferralAt: daysAgo(5) })).some((k) => k.startsWith('inactive'))).toBe(false);
    });

    it('moves the partner to the quiet list 10 days after the 90-day email', () => {
      const h = history({ 'inactive_30:c0': { daysAgo: 70 }, 'inactive_60:c0': { daysAgo: 40 }, 'inactive_90:c0': { daysAgo: 10 } });
      const d = decide(idle(100), state({ inactiveTrackStartedAt: daysAgo(70) }), h, NOW, config);
      expect(d.transitions.enterQuiet).toBe(true);
      expect(decide(idle(99), state({ inactiveTrackStartedAt: daysAgo(69) }), history({ ...Object.fromEntries([...h].map(([k, v]) => [k, { daysAgo: 9 }])) }), NOW, config).transitions.enterQuiet).toBe(false);
    });

    it('sends nothing at all to a partner on the quiet list', () => {
      const st = state({ quietAt: daysAgo(5), referralHighWater: 30, earningsBaseline: 0, earningsHighWater: 300 });
      expect(decide(idle(120), st, new Map(), NOW, config).candidates).toEqual([]);
    });

    it('welcomes a quiet partner back after a login and lets them leave the quiet list', () => {
      const d = decide(snapshot({ lastLoginAt: daysAgo(0) }), state({ quietAt: daysAgo(5) }), new Map(), NOW, config);
      expect(d.candidates.map((c) => c.dedupeKey)).toEqual(['welcome_back:c0']);
      expect(d.transitions.welcomeBack).toBe(true);
    });

    it('welcomes back a partner in the inactive track who makes a new referral', () => {
      const st = state({ inactiveTrackStartedAt: daysAgo(20), referralHighWater: 1, lastReferralAt: daysAgo(0) });
      const d = decide(idle(50), st, history({ 'inactive_30:c0': { daysAgo: 20 } }), NOW, config);
      expect(d.candidates.map((c) => c.dedupeKey)).toEqual(expect.arrayContaining(['welcome_back:c0', 'referrals_1']));
      expect(d.candidates[0].dedupeKey).toBe('welcome_back:c0');
      expect(d.transitions.welcomeBack).toBe(true);
    });

    it('uses a fresh dedupe key for each inactive cycle', () => {
      expect(keysOf(idle(30), state({ inactiveCycle: 2 }))).toContain('inactive_30:c2');
    });
  });

  describe('eligibility', () => {
    const user = { role: 'agent', status: 'active', emailVerifiedAt: daysAgo(10), metadata: {} };
    it.each([
      [{ ...user, role: 'admin' }, { status: 'active' }, null, 'not_a_partner'],
      [{ ...user, status: 'suspended' }, { status: 'active' }, null, 'user_not_active'],
      [{ ...user, emailVerifiedAt: null }, { status: 'active' }, null, 'email_not_verified'],
      [user, { status: 'inactive' }, null, 'partner_not_active'],
      [user, { status: 'active' }, { unsubscribedAt: daysAgo(1) }, 'unsubscribed'],
      [{ ...user, metadata: { emailNotifications: false } }, { status: 'active' }, null, 'email_notifications_off'],
    ])('excludes %#', (u, a, s, reason) => {
      expect(eligibilityOf(u as any, a, s as any)).toEqual({ eligible: false, reason });
    });

    it('sends ineligible partners nothing, but still tells the team about an unsubscribed partner\'s 100th referral', () => {
      const st = state({ referralBaseline: 90, referralHighWater: 100 });
      expect(decide(snapshot({ eligible: false, ineligibleReason: 'user_not_active' }), st, new Map(), NOW, config).candidates).toEqual([]);
      expect(
        decide(snapshot({ eligible: false, ineligibleReason: 'unsubscribed' }), st, new Map(), NOW, config).candidates.map((c) => c.dedupeKey),
      ).toEqual(['referrals_100_team']);
    });
  });

  describe('observe()', () => {
    it('baselines a partner seen for the first time at their current figures', () => {
      const r = observe(snapshot({ totalReferrals: 7, commissionEarnings: 64 }), null, NOW);
      expect(r.bootstrapped).toBe(true);
      expect(r.state).toMatchObject({ referralBaseline: 7, referralHighWater: 7, earningsBaseline: 64, earningsHighWater: 64, trackingStartedAt: NOW });
    });

    it('leaves the earnings baseline open for a partner who looks zeroed by a bad upload, and absorbs the restore silently', () => {
      const first = observe(snapshot({ commissionEarnings: 0, historicEarnings: 80 }), null, NOW);
      expect(first.state.earningsBaseline).toBeNull();
      const restored = observe(snapshot({ commissionEarnings: 80 }), first.state, daysAgo(-1));
      expect(restored).toMatchObject({ earningsRestored: true, earningsIncreased: false });
      expect(restored.state).toMatchObject({ earningsBaseline: 80, earningsHighWater: 80, lastEarningsIncreaseAt: null });
    });

    it('never lowers the high-water marks when an upload drops the totals', () => {
      const prev = state({ referralHighWater: 10, earningsHighWater: 50 });
      const r = observe(snapshot({ totalReferrals: 0, commissionEarnings: 0 }), prev, NOW);
      expect(r.state).toMatchObject({ referralHighWater: 10, earningsHighWater: 50 });
      expect(r.newReferral).toBe(false);
    });

    it('records a new referral only when the count beats the high-water mark', () => {
      const prev = state({ referralHighWater: 10, lastReferralAt: daysAgo(30) });
      expect(observe(snapshot({ totalReferrals: 10 }), prev, NOW).newReferral).toBe(false);
      const r = observe(snapshot({ totalReferrals: 11 }), prev, NOW);
      expect(r.newReferral).toBe(true);
      expect(r.state.lastReferralAt).toEqual(NOW);
    });
  });

  describe('helpers', () => {
    it('excludes the welcome credit from commission until an upload has replaced the total', () => {
      expect(commissionEarningsOf({ totalEarnings: '3.00', metadata: { welcomeCreditAwardedAt: 'x', welcomeCreditAmount: 3 } })).toBe(0);
      expect(commissionEarningsOf({ totalEarnings: 15, metadata: { welcomeCreditAwardedAt: 'x', lastDataUpload: {} } })).toBe(15);
      expect(commissionEarningsOf({ totalEarnings: 15, metadata: null })).toBe(15);
    });

    it('counts calendar days in the configured time zone', () => {
      // 23:30 UTC on 31 Mar 2026 is already 1 Apr in London (BST).
      expect(calendarDaysBetween(new Date('2026-03-31T23:30:00Z'), new Date('2026-04-01T08:00:00Z'), 'Europe/London')).toBe(0);
      expect(calendarDaysBetween(new Date('2026-03-31T22:30:00Z'), new Date('2026-04-01T08:00:00Z'), 'Europe/London')).toBe(1);
    });
  });
});
