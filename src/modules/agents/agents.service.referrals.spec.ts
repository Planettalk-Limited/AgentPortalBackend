import { AgentsService } from './agents.service';

/**
 * Regression guard for the "Referrals This Month stays 0 after a bulk upload" bug.
 *
 * A monthly CSV upload writes metadata.currentMonthReferrals and overwrites the
 * totalReferrals column, but creates no referral_usages rows — so counting usage
 * rows left the dashboard tile at 0 while Total Referrals moved.
 */
describe('AgentsService.calculateReferralsThisMonth', () => {
  const startOfMonth = new Date(2025, 6, 1);
  const endOfMonth = new Date(2025, 6, 31, 23, 59, 59, 999);

  let usageCount: number;
  let queryBuilderWhere: string | null;
  let queryBuilderParams: Record<string, any> | null;
  let service: AgentsService;

  const callWith = (agent: any) =>
    (service as any).calculateReferralsThisMonth(agent, startOfMonth, endOfMonth);

  beforeEach(() => {
    usageCount = 0;
    queryBuilderWhere = null;
    queryBuilderParams = null;

    const queryBuilder: any = {
      leftJoin: () => queryBuilder,
      where: (clause: string, params: Record<string, any>) => {
        queryBuilderWhere = clause;
        queryBuilderParams = params;
        return queryBuilder;
      },
      andWhere: () => queryBuilder,
      getCount: async () => usageCount,
    };

    // Bypass the constructor: this method only needs the referral usage repository.
    service = Object.create(AgentsService.prototype);
    (service as any).referralUsageRepository = {
      createQueryBuilder: () => queryBuilder,
    };
  });

  it('uses the uploaded current-month figure when the CSV supplied one', async () => {
    const agent = {
      id: 'agent-uuid',
      agentCode: 'PT0009',
      metadata: { currentMonthReferrals: 1 },
    };

    await expect(callWith(agent)).resolves.toBe(1);
  });

  it('reports the uploaded figure even when no referral usage rows exist', async () => {
    usageCount = 0;
    const agent = {
      id: 'agent-uuid',
      agentCode: 'PT0009',
      metadata: { currentMonthReferrals: 3 },
    };

    await expect(callWith(agent)).resolves.toBe(3);
  });

  it('coerces the uploaded figure when the CSV parsed it as a string', async () => {
    const agent = {
      id: 'agent-uuid',
      agentCode: 'PT0009',
      metadata: { currentMonthReferrals: '2' },
    };

    await expect(callWith(agent)).resolves.toBe(2);
  });

  it('falls back to counting usage rows when no upload has set the figure', async () => {
    usageCount = 4;
    const agent = { id: 'agent-uuid', agentCode: 'PT0009', metadata: {} };

    await expect(callWith(agent)).resolves.toBe(4);
  });

  it('treats an explicit zero from the upload as authoritative, not as missing', async () => {
    usageCount = 7;
    const agent = {
      id: 'agent-uuid',
      agentCode: 'PT0009',
      metadata: { currentMonthReferrals: 0 },
    };

    await expect(callWith(agent)).resolves.toBe(0);
  });

  it('matches portal-captured referrals by agent code, not only by referral code join', async () => {
    const agent = { id: 'agent-uuid', agentCode: 'PT0009', metadata: null };

    await callWith(agent);

    expect(queryBuilderWhere).toContain("usage.metadata->>'agentCode' = :agentCode");
    expect(queryBuilderParams).toEqual({ agentId: 'agent-uuid', agentCode: 'PT0009' });
  });
});
