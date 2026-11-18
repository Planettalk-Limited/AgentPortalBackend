import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { AgentEarnings } from '../agents/entities/agent-earnings.entity';
import { UserRole } from '../users/entities/user.entity';
import { PartnerLifecycleState } from './entities/partner-lifecycle-state.entity';
import { LifecycleEmail, LifecycleEmailStatus } from './entities/lifecycle-email.entity';
import { PartnerLifecycleEvent } from './entities/partner-lifecycle-event.entity';
import { LifecycleStateView } from './lifecycle.rules';

export const LIFECYCLE_STORE = Symbol('LIFECYCLE_STORE');

export interface PartnerRecord {
  agent: {
    id: string;
    agentCode: string;
    status: string;
    totalReferrals: number;
    totalEarnings: number | string;
    metadata: Record<string, any> | null;
    activatedAt: Date | null;
    createdAt: Date;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
    metadata: Record<string, any> | null;
  };
}

export interface StoredState extends LifecycleStateView {
  agentId: string;
  userId: string;
  unsubscribeSource?: string | null;
  lastEvaluatedAt?: Date | null;
}

export interface HistoryRow {
  id: string;
  dedupeKey: string;
  templateKey: string;
  segment: string;
  status: LifecycleEmailStatus;
  sentAt: Date | null;
  createdAt: Date;
  attempts: number;
}

export interface ClaimInput {
  agentId: string;
  userId: string;
  templateKey: string;
  dedupeKey: string;
  segment: string;
  recipient: string;
  subject: string;
  context?: Record<string, any>;
}

export interface LifecycleEventInput {
  agentId: string;
  type: 'referral_milestone' | 'comeback';
  dedupeKey: string;
  value?: number | null;
  occurredAt: Date;
  context?: Record<string, any> | null;
}

/** Persistence used by a lifecycle run. Abstracted so the run logic can be tested in memory. */
export interface LifecycleStore {
  loadPartners(): Promise<PartnerRecord[]>;
  loadStates(): Promise<Map<string, StoredState>>;
  loadHistory(): Promise<Map<string, HistoryRow[]>>;
  /** Sum of each partner's non-cancelled earning records with earnedAt in [from, to), welcome credit excluded. */
  loadEarningsBetween(from: Date, to: Date): Promise<Map<string, number>>;
  /** Lifetime sum of the same records, for partners seen for the first time. */
  loadHistoricEarnings(agentIds: string[]): Promise<Map<string, number>>;
  saveState(state: StoredState): Promise<void>;
  /**
   * Atomically reserve (agentId, dedupeKey) before sending. Returns the row id, or null if
   * it is already taken (sent, in flight, suppressed, or failed with no retries left).
   */
  claim(input: ClaimInput, maxAttempts: number): Promise<string | null>;
  markSent(id: string, result: { messageId?: string; simulated?: boolean; at: Date }): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  recordSuppressed(input: Omit<ClaimInput, 'recipient' | 'subject'> & { reason: string }): Promise<void>;
  markConversions(agentId: string, segments: string[], type: string, since: Date, at: Date): Promise<number>;
  /** Record a dashboard event once per (agentId, dedupeKey); a repeat is ignored. */
  recordEvent(input: LifecycleEventInput): Promise<void>;
  /** Runs fn while holding a cluster-wide lock; resolves null if another run holds it. */
  withRunLock<T>(fn: () => Promise<T>): Promise<T | null>;
}

const RUN_LOCK_KEY = 728_461_903; // arbitrary constant for pg_try_advisory_lock

function num(v: unknown): number {
  return Number(v) || 0;
}

export function toStateView(row: PartnerLifecycleState): StoredState {
  return {
    agentId: row.agentId,
    userId: row.userId,
    trackingStartedAt: row.trackingStartedAt,
    referralBaseline: num(row.referralBaseline),
    referralHighWater: num(row.referralHighWater),
    lastReferralAt: row.lastReferralAt,
    earningsBaseline: row.earningsBaseline === null || row.earningsBaseline === undefined ? null : num(row.earningsBaseline),
    earningsHighWater: num(row.earningsHighWater),
    lastEarningsIncreaseAt: row.lastEarningsIncreaseAt,
    inactiveCycle: num(row.inactiveCycle),
    inactiveTrackStartedAt: row.inactiveTrackStartedAt,
    quietAt: row.quietAt,
    unsubscribedAt: row.unsubscribedAt,
    unsubscribeSource: row.unsubscribeSource,
    lastEvaluatedAt: row.lastEvaluatedAt,
  };
}

@Injectable()
export class TypeOrmLifecycleStore implements LifecycleStore {
  constructor(
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
    @InjectRepository(AgentEarnings) private readonly earnings: Repository<AgentEarnings>,
    @InjectRepository(PartnerLifecycleState) private readonly states: Repository<PartnerLifecycleState>,
    @InjectRepository(LifecycleEmail) private readonly emails: Repository<LifecycleEmail>,
    @InjectRepository(PartnerLifecycleEvent) private readonly events: Repository<PartnerLifecycleEvent>,
    private readonly dataSource: DataSource,
  ) {}

  async loadPartners(): Promise<PartnerRecord[]> {
    const agents = await this.agents
      .createQueryBuilder('agent')
      .innerJoin('agent.user', 'user')
      .select([
        'agent.id', 'agent.agentCode', 'agent.status', 'agent.totalReferrals', 'agent.totalEarnings',
        'agent.metadata', 'agent.activatedAt', 'agent.createdAt',
        'user.id', 'user.email', 'user.firstName', 'user.lastName', 'user.role', 'user.status',
        'user.emailVerifiedAt', 'user.lastLoginAt', 'user.metadata',
      ])
      .where('user.role = :role', { role: UserRole.AGENT })
      .getMany();
    return agents.map((a) => ({ agent: a as any, user: a.user as any }));
  }

  async loadStates(): Promise<Map<string, StoredState>> {
    const rows = await this.states.find();
    return new Map(rows.map((r) => [r.agentId, toStateView(r)]));
  }

  async loadHistory(): Promise<Map<string, HistoryRow[]>> {
    const rows = await this.emails.find({
      select: ['id', 'agentId', 'dedupeKey', 'templateKey', 'segment', 'status', 'sentAt', 'createdAt', 'attempts'],
    });
    const map = new Map<string, HistoryRow[]>();
    for (const r of rows) {
      const list = map.get(r.agentId) ?? [];
      list.push(r);
      map.set(r.agentId, list);
    }
    return map;
  }

  private earningsQuery() {
    return this.earnings
      .createQueryBuilder('e')
      .select('e.agentId', 'agentId')
      .addSelect('COALESCE(SUM(e.amount), 0)', 'total')
      .where("e.status <> 'cancelled'")
      .andWhere("e.type <> 'penalty'")
      .andWhere("COALESCE(e.metadata->>'source', '') <> 'welcome_credit'")
      .andWhere("COALESCE(e.description, '') <> 'Welcome credit'")
      .groupBy('e.agentId');
  }

  async loadEarningsBetween(from: Date, to: Date): Promise<Map<string, number>> {
    const rows = await this.earningsQuery()
      .andWhere('e.earnedAt >= :from AND e.earnedAt < :to', { from, to })
      .getRawMany();
    return new Map(rows.map((r) => [r.agentId, num(r.total)]));
  }

  async loadHistoricEarnings(agentIds: string[]): Promise<Map<string, number>> {
    if (!agentIds.length) return new Map();
    const rows = await this.earningsQuery().andWhere('e.agentId IN (:...ids)', { ids: agentIds }).getRawMany();
    return new Map(rows.map((r) => [r.agentId, num(r.total)]));
  }

  async saveState(state: StoredState): Promise<void> {
    await this.states.save(this.states.create(state as Partial<PartnerLifecycleState>));
  }

  async claim(input: ClaimInput, maxAttempts: number): Promise<string | null> {
    const inserted = await this.emails
      .createQueryBuilder()
      .insert()
      .into(LifecycleEmail)
      .values({ ...input, status: 'pending', attempts: 1 })
      .orIgnore()
      .returning(['id'])
      .execute();
    if (inserted.raw?.length) return inserted.raw[0].id;

    // Already exists: only a failed send with retries left may be re-claimed.
    const retried = await this.emails
      .createQueryBuilder()
      .update(LifecycleEmail)
      .set({
        status: 'pending',
        attempts: () => '"attempts" + 1',
        recipient: input.recipient,
        subject: input.subject,
      })
      .where('"agentId" = :agentId AND "dedupeKey" = :dedupeKey', input)
      .andWhere("status = 'failed' AND attempts < :maxAttempts", { maxAttempts })
      .returning(['id'])
      .execute();
    return retried.raw?.length ? retried.raw[0].id : null;
  }

  async markSent(id: string, result: { messageId?: string; simulated?: boolean; at: Date }): Promise<void> {
    const row = await this.emails.findOne({ where: { id }, select: ['id', 'context'] });
    await this.emails.update(id, {
      status: 'sent',
      sentAt: result.at,
      mailgunMessageId: result.messageId ?? null,
      lastError: null,
      context: { ...(row?.context || {}), ...(result.simulated ? { simulated: true } : {}) } as any,
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.emails.update(id, { status: 'failed', lastError: error.slice(0, 2000) });
  }

  async recordSuppressed(input: Omit<ClaimInput, 'recipient' | 'subject'> & { reason: string }): Promise<void> {
    const { reason, context, ...rest } = input;
    await this.emails
      .createQueryBuilder()
      .insert()
      .into(LifecycleEmail)
      .values({ ...rest, status: 'suppressed', attempts: 0, context: { ...(context || {}), reason } as any })
      .orIgnore()
      .execute();
  }

  async markConversions(agentId: string, segments: string[], type: string, since: Date, at: Date): Promise<number> {
    const result = await this.emails
      .createQueryBuilder()
      .update(LifecycleEmail)
      .set({ convertedAt: at, conversionType: type })
      .where('"agentId" = :agentId', { agentId })
      .andWhere("status = 'sent'")
      .andWhere('"convertedAt" IS NULL')
      .andWhere('"sentAt" >= :since', { since })
      .andWhere('segment IN (:...segments)', { segments })
      .execute();
    return result.affected ?? 0;
  }

  async recordEvent(input: LifecycleEventInput): Promise<void> {
    await this.events
      .createQueryBuilder()
      .insert()
      .into(PartnerLifecycleEvent)
      .values({ ...input, value: input.value ?? null, context: (input.context ?? null) as any })
      .orIgnore()
      .execute();
  }

  async withRunLock<T>(fn: () => Promise<T>): Promise<T | null> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      const [{ locked }] = await runner.query('SELECT pg_try_advisory_lock($1) AS locked', [RUN_LOCK_KEY]);
      if (!locked) return null;
      try {
        return await fn();
      } finally {
        await runner.query('SELECT pg_advisory_unlock($1)', [RUN_LOCK_KEY]);
      }
    } finally {
      await runner.release();
    }
  }
}

