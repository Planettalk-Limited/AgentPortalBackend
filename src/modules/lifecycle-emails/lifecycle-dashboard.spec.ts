import { lastMonths, shapeComebacks, summarizeGroups, summarizeMilestones } from './lifecycle-dashboard';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-10T09:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

const partner = (o: Record<string, unknown> = {}) => ({
  activatedAt: daysAgo(400),
  trackingStartedAt: daysAgo(100),
  referralHighWater: 0,
  lastReferralAt: null,
  lastEarningsIncreaseAt: null,
  inactiveTrackStartedAt: null,
  quietAt: null,
  unsubscribedAt: null,
  ...o,
});

describe('summarizeGroups', () => {
  it('counts partners per group, listing every group even when empty', () => {
    const groups = summarizeGroups(
      [
        partner({ activatedAt: daysAgo(3) }),
        partner({ activatedAt: daysAgo(10) }),
        partner({ inactiveTrackStartedAt: daysAgo(5) }),
        partner(),
      ],
      NOW,
    );
    expect(groups.map((g) => [g.group, g.count])).toEqual([
      ['new', 2],
      ['active', 0],
      ['referring', 0],
      ['previously_active', 0],
      ['not_referring', 1],
      ['inactive', 1],
      ['quiet', 0],
      ['unsubscribed', 0],
    ]);
    expect(groups[0].definition).toMatch(/21 days/);
  });
});

describe('summarizeMilestones', () => {
  it('counts partners at or past each milestone, and the crossings recorded in range', () => {
    const rows = summarizeMilestones([1, 5, 10, 50], [0, 1, 7, 12, 60], [
      { value: 5, count: 2 },
      { value: 50, count: 1 },
    ]);
    expect(rows).toEqual([
      { milestone: 1, reached: 4, newInRange: 0 },
      { milestone: 5, reached: 3, newInRange: 2 },
      { milestone: 10, reached: 2, newInRange: 0 },
      { milestone: 50, reached: 1, newInRange: 1 },
    ]);
  });
});

describe('lastMonths', () => {
  it('lists the last N calendar months in the given time zone, oldest first', () => {
    expect(lastMonths(NOW, 3, 'Europe/London')).toEqual(['2026-09', '2026-10', '2026-11']);
    // 23:30 UTC on 31 Dec is already January in Johannesburg.
    expect(lastMonths(new Date('2026-12-31T23:30:00Z'), 2, 'Africa/Johannesburg')).toEqual(['2026-12', '2027-01']);
  });
});

describe('shapeComebacks', () => {
  it('gives each month its total and the last email partners got before coming back', () => {
    const shaped = shapeComebacks(
      ['2026-10', '2026-11'],
      [
        { month: '2026-10', lastEmail: 'inactive_30', count: 3 },
        { month: '2026-10', lastEmail: null, count: 1 },
        { month: '2026-11', lastEmail: 'inactive_90', count: 2 },
        { month: '2026-11', lastEmail: 'inactive_30', count: 1 },
        { month: '2026-06', lastEmail: 'inactive_30', count: 9 }, // outside the window
      ],
    );
    expect(shaped).toEqual([
      { month: '2026-10', total: 4, byLastEmail: { inactive_30: 3, inactive_60: 0, inactive_90: 0, none: 1 } },
      { month: '2026-11', total: 3, byLastEmail: { inactive_30: 1, inactive_60: 0, inactive_90: 2, none: 0 } },
    ]);
  });
});
