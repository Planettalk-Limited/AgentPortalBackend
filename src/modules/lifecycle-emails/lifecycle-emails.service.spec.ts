import { LifecycleEmailsService } from './lifecycle-emails.service';
import { ClaimInput, HistoryRow, LifecycleEventInput, LifecycleStore, PartnerRecord, StoredState } from './lifecycle.store';

const DAY = 24 * 60 * 60 * 1000;
const START = new Date('2026-11-10T09:00:00Z'); // Tuesday
const day = (n: number) => new Date(START.getTime() + n * DAY);

type Row = HistoryRow & {
  agentId: string;
  userId: string;
  recipient?: string;
  subject?: string;
  context?: any;
  mailgunMessageId?: string | null;
  convertedAt?: Date | null;
  conversionType?: string | null;
  lastError?: string | null;
};

/** In-memory LifecycleStore with the same claim semantics as the unique index in Postgres. */
class MemoryStore implements LifecycleStore {
  partners: PartnerRecord[] = [];
  states = new Map<string, StoredState>();
  rows: Row[] = [];
  events: LifecycleEventInput[] = [];
  lastMonth = new Map<string, number>();
  historic = new Map<string, number>();
  private locked = false;
  private seq = 0;

  async loadPartners() {
    return this.partners.map((p) => ({ agent: { ...p.agent }, user: { ...p.user } }));
  }
  async loadStates() {
    return new Map([...this.states].map(([k, v]) => [k, { ...v }]));
  }
  async loadHistory() {
    const map = new Map<string, HistoryRow[]>();
    for (const r of this.rows) map.set(r.agentId, [...(map.get(r.agentId) ?? []), { ...r }]);
    return map;
  }
  async loadEarningsBetween() {
    return new Map(this.lastMonth);
  }
  async loadHistoricEarnings(ids: string[]) {
    return new Map([...this.historic].filter(([k]) => ids.includes(k)));
  }
  async saveState(state: StoredState) {
    this.states.set(state.agentId, { ...state });
  }
  async claim(input: ClaimInput, maxAttempts: number) {
    const existing = this.rows.find((r) => r.agentId === input.agentId && r.dedupeKey === input.dedupeKey);
    if (!existing) {
      const id = `email-${++this.seq}`;
      this.rows.push({ ...input, id, status: 'pending', attempts: 1, sentAt: null, createdAt: new Date() });
      return id;
    }
    if (existing.status === 'failed' && existing.attempts < maxAttempts) {
      existing.status = 'pending';
      existing.attempts++;
      return existing.id;
    }
    return null;
  }
  async markSent(id: string, result: { messageId?: string; at: Date }) {
    Object.assign(this.rows.find((r) => r.id === id)!, { status: 'sent', sentAt: result.at, mailgunMessageId: result.messageId });
  }
  async markFailed(id: string, error: string) {
    Object.assign(this.rows.find((r) => r.id === id)!, { status: 'failed', lastError: error });
  }
  async recordSuppressed(input: any) {
    if (this.rows.some((r) => r.agentId === input.agentId && r.dedupeKey === input.dedupeKey)) return;
    this.rows.push({ ...input, id: `email-${++this.seq}`, status: 'suppressed', attempts: 0, sentAt: null, createdAt: new Date() });
  }
  async markConversions(agentId: string, segments: string[], type: string, since: Date, at: Date) {
    let n = 0;
    for (const r of this.rows) {
      if (r.agentId === agentId && r.status === 'sent' && !r.convertedAt && r.sentAt! >= since && segments.includes(r.segment)) {
        r.convertedAt = at;
        r.conversionType = type;
        n++;
      }
    }
    return n;
  }
  async recordEvent(input: LifecycleEventInput) {
    if (this.events.some((e) => e.agentId === input.agentId && e.dedupeKey === input.dedupeKey)) return;
    this.events.push({ ...input });
  }
  async withRunLock<T>(fn: () => Promise<T>) {
    if (this.locked) return null;
    this.locked = true;
    try {
      return await fn();
    } finally {
      this.locked = false;
    }
  }

  sent(dedupePrefix = '') {
    return this.rows.filter((r) => r.status === 'sent' && r.dedupeKey.startsWith(dedupePrefix)).map((r) => r.dedupeKey);
  }
}

function partner(overrides: { agent?: Partial<PartnerRecord['agent']>; user?: Partial<PartnerRecord['user']> } = {}): PartnerRecord {
  return {
    agent: {
      id: 'agent-1',
      agentCode: 'PT0001',
      status: 'active',
      totalReferrals: 0,
      totalEarnings: 0,
      metadata: { lastDataUpload: { batchId: 'b' } },
      activatedAt: new Date('2025-01-15T10:00:00Z'),
      createdAt: new Date('2025-01-15T10:00:00Z'),
      ...overrides.agent,
    },
    user: {
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Partner',
      role: 'agent',
      status: 'active',
      emailVerifiedAt: new Date('2025-01-15T10:00:00Z'),
      lastLoginAt: START,
      metadata: {},
      ...overrides.user,
    },
  };
}

function setup(env: Record<string, string> = {}) {
  const store = new MemoryStore();
  const emailService = {
    getPartnerPortalBaseUrl: () => 'https://portal.test/en',
    sendEmailWithResult: jest.fn(async () => ({ success: true, messageId: 'mg-1' })),
  };
  const settings: Record<string, string> = {
    LIFECYCLE_EMAILS_ENABLED: 'true',
    LIFECYCLE_ALLOW_DRAFT_COPY: 'true',
    JWT_SECRET: 'test-secret',
    ...env,
  };
  const service = new LifecycleEmailsService(store, emailService as any, { get: (k: string) => settings[k] } as any);
  const run = (at: Date, dryRun = false) => service.run({ dryRun, trigger: 'admin', now: at });
  return { store, emailService, service, run };
}

describe('LifecycleEmailsService.run', () => {
  it('baselines existing partners on the first run without congratulating them on old milestones', async () => {
    const { store, run, emailService } = setup();
    store.partners = [partner({ agent: { totalReferrals: 37, totalEarnings: 400 } })];

    const report = await run(START);

    expect(report.partnersFirstSeen).toBe(1);
    expect(emailService.sendEmailWithResult).not.toHaveBeenCalled();
    expect(store.states.get('agent-1')).toMatchObject({ referralBaseline: 37, referralHighWater: 37, earningsBaseline: 400 });
  });

  it('is idempotent: a second run on the same day sends nothing again', async () => {
    const { store, run, emailService } = setup({ LIFECYCLE_MAX_EMAILS_PER_PARTNER_PER_DAY: '5' });
    store.partners = [partner()];
    await run(START);
    store.partners[0].agent.totalReferrals = 1;

    const first = await run(day(1));
    const second = await run(new Date(day(1).getTime() + 2 * 60 * 60 * 1000));

    expect(first.emails.filter((e) => e.outcome === 'sent').map((e) => e.dedupeKey)).toEqual(['referrals_1']);
    expect(second.emails.filter((e) => e.outcome === 'sent')).toEqual([]);
    expect(emailService.sendEmailWithResult).toHaveBeenCalledTimes(1);
    expect(store.rows.filter((r) => r.dedupeKey === 'referrals_1')).toHaveLength(1);
  });

  it('cannot double-send when a claim is already taken (overlapping instance)', async () => {
    const { store, run, emailService } = setup();
    store.partners = [partner()];
    await run(START);
    store.partners[0].agent.totalReferrals = 1;
    // Another instance claimed the row between our history load and our send.
    const realClaim = store.claim.bind(store);
    store.claim = async (input, max) => {
      await realClaim(input, max);
      return realClaim(input, max);
    };

    const report = await run(day(1));

    expect(report.emails.map((e) => e.outcome)).toEqual(['already_claimed']);
    expect(emailService.sendEmailWithResult).not.toHaveBeenCalled();
  });

  it('refuses to run while another run holds the lock', async () => {
    const { store, run } = setup();
    store.partners = [partner()];
    let inner: any;
    await store.withRunLock(async () => {
      inner = await run(START);
    });
    expect(inner.skipped).toMatch(/in progress/);
  });

  it('sends each earnings milestone once ever, even when the total goes 50 -> 0 -> 50', async () => {
    const { store, run, emailService } = setup({ LIFECYCLE_MAX_EMAILS_PER_PARTNER_PER_DAY: '5' });
    store.partners = [partner({ agent: { totalEarnings: 0 } })];
    await run(START); // baseline at $0

    store.partners[0].agent.totalEarnings = 50;
    await run(day(1));
    store.partners[0].agent.totalEarnings = 0; // bad upload
    await run(day(2));
    store.partners[0].agent.totalEarnings = 50; // corrected re-upload
    await run(day(3));
    await run(day(4));

    expect(store.sent('earnings')).toEqual(['earnings_first', 'earnings_50']);
    expect(emailService.sendEmailWithResult).toHaveBeenCalledTimes(2);
    expect(store.states.get('agent-1')!.earningsHighWater).toBe(50);
  });

  it('sends no earnings email to a partner zeroed by a bad upload before go-live once the total is restored', async () => {
    const { store, run, emailService } = setup({ LIFECYCLE_MAX_EMAILS_PER_PARTNER_PER_DAY: '5' });
    store.partners = [partner({ agent: { totalEarnings: 0 } })];
    store.historic.set('agent-1', 120); // earning records exist, so $0 is suspicious
    await run(START);

    store.partners[0].agent.totalEarnings = 120;
    await run(day(1));
    store.partners[0].agent.totalEarnings = 130; // genuine growth afterwards: still no threshold crossed
    await run(day(2));

    expect(emailService.sendEmailWithResult).not.toHaveBeenCalled();
    expect(store.states.get('agent-1')).toMatchObject({ earningsBaseline: 120, earningsHighWater: 130 });
  });

  it('caps partner emails per day and sends the deferred one on the next run', async () => {
    const { store, run } = setup();
    store.partners = [partner({ agent: { totalEarnings: 0 } })];
    await run(START);
    store.partners[0].agent.totalEarnings = 60;

    const d1 = await run(day(1));
    const d2 = await run(day(2));

    expect(d1.emails.map((e) => [e.dedupeKey, e.outcome])).toEqual([
      ['earnings_first', 'sent'],
      ['earnings_50', 'deferred_daily_cap'],
    ]);
    expect(d2.emails.map((e) => [e.dedupeKey, e.outcome])).toEqual([['earnings_50', 'sent']]);
  });

  it('records lower milestones as suppressed when an upload jumps straight past them', async () => {
    const { store, run } = setup();
    store.partners = [partner()];
    await run(START);
    store.partners[0].agent.totalReferrals = 12;
    await run(day(1));
    await run(day(2));

    expect(store.sent('referrals')).toEqual(['referrals_10']);
    expect(store.rows.filter((r) => r.status === 'suppressed').map((r) => r.dedupeKey).sort()).toEqual(['referrals_1', 'referrals_5']);
  });

  it('notifies the partner team about a 100th referral in addition to the partner email', async () => {
    const { store, run, emailService } = setup({ LIFECYCLE_PARTNER_TEAM_EMAILS: 'team@planettalk.com' });
    store.partners = [partner({ agent: { totalReferrals: 99 } })];
    await run(START);
    store.partners[0].agent.totalReferrals = 100;
    await run(day(1));

    const recipients = (emailService.sendEmailWithResult.mock.calls as any[]).map(([o]) => o.to);
    expect(recipients.sort()).toEqual(['ada@example.com', 'team@planettalk.com']);
    expect(store.sent()).toEqual(expect.arrayContaining(['referrals_100', 'referrals_100_team']));
  });

  it('does not credit a comeback outside the attribution window', async () => {
    const { store, run } = setup();
    store.partners = [partner({ user: { lastLoginAt: new Date('2025-02-01T00:00:00Z') } })];
    await run(START);
    await run(day(30)); // inactive_30
    store.partners[0].user.lastLoginAt = day(70);
    await run(day(71)); // welcome back, 41 days after the only inactive email

    expect(store.sent()).toEqual(['inactive_30:c0', 'welcome_back:c0']);
    expect(store.rows.find((r) => r.dedupeKey === 'inactive_30:c0')!.convertedAt).toBeUndefined();
  });

  it('walks an inactive partner through 30/60/90, the quiet list, and back out with "Welcome back"', async () => {
    const { store, run } = setup();
    store.partners = [partner({ user: { lastLoginAt: new Date('2025-02-01T00:00:00Z') } })];
    await run(START); // tracking starts: inactivity is measured from here

    const sentOn = async (n: number) => (await run(day(n))).emails.filter((e) => e.outcome === 'sent').map((e) => e.dedupeKey);

    expect(await sentOn(29)).toEqual([]);
    expect(await sentOn(30)).toEqual(['inactive_30:c0']);
    expect(store.states.get('agent-1')!.inactiveTrackStartedAt).toEqual(day(30));
    expect(await sentOn(60)).toEqual(['inactive_60:c0']);
    expect(await sentOn(90)).toEqual(['inactive_90:c0']);
    expect(await sentOn(99)).toEqual([]);
    expect(store.states.get('agent-1')!.quietAt).toBeNull();

    const quietRun = await run(day(100));
    expect(quietRun.transitions.enteredQuiet).toEqual(['PT0001']);
    expect(store.states.get('agent-1')!.quietAt).toEqual(day(100));
    expect(await sentOn(105)).toEqual([]); // quiet: nothing at all

    // The partner logs in again, 20 days after the 90-day email (inside the attribution window).
    store.partners[0].user.lastLoginAt = new Date(day(110).getTime() - 3 * 60 * 60 * 1000);
    const back = await run(day(110));
    expect(back.emails.filter((e) => e.outcome === 'sent').map((e) => e.dedupeKey)).toEqual(['welcome_back:c0']);
    expect(store.states.get('agent-1')).toMatchObject({ quietAt: null, inactiveTrackStartedAt: null, inactiveCycle: 1 });
    expect(store.rows.find((r) => r.dedupeKey === 'inactive_90:c0')).toMatchObject({ conversionType: 'reactivated' });

    expect(await sentOn(111)).toEqual([]);
    // Inactive again for 30 days after that login: a new cycle starts.
    expect(await sentOn(139)).toEqual([]);
    expect(await sentOn(140)).toEqual(['inactive_30:c1']);
  });

  it('credits onboarding emails with the first referral that follows them', async () => {
    const { store, run } = setup();
    const activated = new Date(START.getTime() - 9 * DAY);
    store.partners = [partner({ agent: { activatedAt: activated, createdAt: activated }, user: { lastLoginAt: null } })];
    await run(START); // day 9 since activation: nothing due
    expect(store.sent()).toEqual([]);

    await run(day(1)); // day 10
    expect(store.sent()).toEqual(['onboarding_day10']);

    store.partners[0].agent.totalReferrals = 1;
    await run(day(2));

    expect(store.rows.find((r) => r.dedupeKey === 'onboarding_day10')).toMatchObject({ conversionType: 'referral' });
    expect(store.sent()).toEqual(['onboarding_day10', 'referrals_1']);
  });

  it('retries a failed send on the next run, up to the attempt limit', async () => {
    const { store, run, emailService } = setup({ LIFECYCLE_MAX_SEND_ATTEMPTS: '2' });
    emailService.sendEmailWithResult.mockResolvedValue({ success: false, error: 'Mailgun down' } as any);
    store.partners = [partner()];
    await run(START);
    store.partners[0].agent.totalReferrals = 1;

    expect((await run(day(1))).emails[0].outcome).toBe('failed');
    expect((await run(day(2))).emails[0].outcome).toBe('failed');
    expect((await run(day(3))).emails).toEqual([]);
    expect(store.rows.find((r) => r.dedupeKey === 'referrals_1')).toMatchObject({ status: 'failed', attempts: 2 });
  });

  it('dry run lists recipients but writes and sends nothing', async () => {
    const { store, run, emailService } = setup();
    store.partners = [partner()];
    await run(START);
    store.partners[0].agent.totalReferrals = 1;
    const before = JSON.stringify([...store.states]);

    const preview = await run(day(1), true);

    expect(preview.emails).toEqual([expect.objectContaining({ dedupeKey: 'referrals_1', outcome: 'would_send', email: 'ada@example.com' })]);
    expect(emailService.sendEmailWithResult).not.toHaveBeenCalled();
    expect(store.rows).toEqual([]);
    expect(JSON.stringify([...store.states])).toBe(before);
  });

  it('sends nothing when the master switch is off, and holds draft copy unless allowed', async () => {
    const off = setup({ LIFECYCLE_EMAILS_ENABLED: 'false' });
    off.store.partners = [partner()];
    expect((await off.run(START)).skipped).toMatch(/LIFECYCLE_EMAILS_ENABLED/);

    const draft = setup({ LIFECYCLE_ALLOW_DRAFT_COPY: 'false' });
    draft.store.partners = [partner()];
    await draft.run(START);
    draft.store.partners[0].agent.totalReferrals = 1;
    expect((await draft.run(day(1))).emails.map((e) => e.outcome)).toEqual(['blocked_draft_copy']);
    expect(draft.emailService.sendEmailWithResult).not.toHaveBeenCalled();
  });

  it('only emails allow-listed recipients when an allowlist is set', async () => {
    const { store, run, emailService } = setup({ LIFECYCLE_RECIPIENT_ALLOWLIST: '@planettalk.com' });
    store.partners = [partner()];
    await run(START);
    store.partners[0].agent.totalReferrals = 1;
    expect((await run(day(1))).emails.map((e) => e.outcome)).toEqual(['blocked_allowlist']);
    expect(emailService.sendEmailWithResult).not.toHaveBeenCalled();
  });

  it('skips unsubscribed partners but keeps tracking their figures', async () => {
    const { store, run, emailService } = setup();
    store.partners = [partner()];
    await run(START);
    store.states.get('agent-1')!.unsubscribedAt = START;
    store.partners[0].agent.totalReferrals = 5;
    await run(day(1));

    expect(emailService.sendEmailWithResult).not.toHaveBeenCalled();
    expect(store.states.get('agent-1')!.referralHighWater).toBe(5);
  });

  it('tags the email for Mailgun analytics and includes a signed unsubscribe link', async () => {
    const { store, run, emailService } = setup();
    store.partners = [partner()];
    await run(START);
    store.partners[0].agent.totalReferrals = 1;
    await run(day(1));

    const [options] = (emailService.sendEmailWithResult.mock.calls as any[])[0];
    expect(options.subject).toBe('Your first referral is in!');
    expect(options.template).toBe('lifecycle');
    expect(options.mailgun).toMatchObject({
      tags: ['partner-lifecycle', 'lifecycle-referrals_1', 'lifecycle-segment-referral_milestone'],
      trackOpens: true,
      trackClicks: true,
      variables: { lifecycle_email_id: 'email-1', lifecycle_template: 'referrals_1' },
    });
    expect(options.templateData.unsubscribeLink).toMatch(/\/lifecycle-emails\/unsubscribe\?agent=agent-1&token=[\w-]+&e=email-1$/);
    expect(options.mailgun.headers['List-Unsubscribe']).toBe(`<${options.templateData.unsubscribeLink}>`);
  });
});

describe('LifecycleEmailsService.run: dashboard events', () => {
  it('records each referral milestone a partner crosses, once, even when no email can go out', async () => {
    // Draft copy blocked: the milestone emails cannot send, but the crossings must still count.
    const { store, run } = setup({ LIFECYCLE_ALLOW_DRAFT_COPY: 'false' });
    store.partners = [partner({ agent: { totalReferrals: 3 } })];
    await run(START);
    expect(store.events).toEqual([]); // the baseline is not a crossing

    store.partners[0].agent.totalReferrals = 12;
    await run(day(1));
    store.partners[0].agent.totalReferrals = 0; // bad upload
    await run(day(2));
    store.partners[0].agent.totalReferrals = 12; // restored
    await run(day(3));

    expect(store.events.map((e) => [e.type, e.value, e.occurredAt])).toEqual([
      ['referral_milestone', 5, day(1)],
      ['referral_milestone', 10, day(1)],
    ]);
  });

  it('records nothing on a dry run', async () => {
    const { store, run } = setup();
    store.partners = [partner()];
    await run(START);
    store.partners[0].agent.totalReferrals = 1;
    await run(day(1), true);
    expect(store.events).toEqual([]);
  });

  it('records a comeback with the last re-engagement email the partner got', async () => {
    const { store, run } = setup();
    store.partners = [partner({ user: { lastLoginAt: new Date('2025-02-01T00:00:00Z') } })];
    await run(START);
    await run(day(30)); // inactive_30
    await run(day(60)); // inactive_60
    store.partners[0].user.lastLoginAt = day(65);
    await run(day(66));

    expect(store.events).toEqual([
      expect.objectContaining({
        agentId: 'agent-1',
        type: 'comeback',
        dedupeKey: 'comeback:c0',
        occurredAt: day(66),
        context: { from: 'inactive_track', lastEmail: 'inactive_60', lastEmailSentAt: day(60).toISOString() },
      }),
    ]);
  });

  it('records a comeback with no email when the re-engagement copy was held back', async () => {
    const { store, run } = setup();
    store.partners = [partner({ user: { lastLoginAt: new Date('2025-02-01T00:00:00Z') } })];
    await run(START);
    await run(day(30));
    store.rows = []; // as if inactive_30 had never gone out
    store.partners[0].user.lastLoginAt = day(40);
    await run(day(41));

    expect(store.events[0]).toMatchObject({ type: 'comeback', context: { lastEmail: null } });
  });
});
