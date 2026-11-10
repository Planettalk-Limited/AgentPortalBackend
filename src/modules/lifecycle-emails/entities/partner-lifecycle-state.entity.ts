import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

/**
 * One row per partner (agent): what the lifecycle job last observed and where the
 * partner sits in the re-engagement tracks. Written only by LifecycleEmailsService.
 */
@Entity('partner_lifecycle_state')
@Index('IDX_partner_lifecycle_state_user', ['userId'])
export class PartnerLifecycleState {
  @PrimaryColumn('uuid', { primaryKeyConstraintName: 'PK_partner_lifecycle_state' })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId', foreignKeyConstraintName: 'FK_partner_lifecycle_state_agent' })
  agent?: Agent;

  @Column({ type: 'uuid' })
  userId: string;

  /** First time the lifecycle job saw this partner; figures at that point are the baseline. */
  @Column({ type: 'timestamp' })
  trackingStartedAt: Date;

  @Column({ type: 'integer', default: 0 })
  referralBaseline: number;

  /** Highest totalReferrals ever observed. Never decreases, so a bad upload cannot re-trigger milestones. */
  @Column({ type: 'integer', default: 0 })
  referralHighWater: number;

  /** When the job observed referralHighWater go up (accurate to one daily run). */
  @Column({ type: 'timestamp', nullable: true })
  lastReferralAt: Date | null;

  /** Commission at tracking start; NULL while waiting for a bad upload to be corrected. */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  earningsBaseline: number | null;

  /** Highest commission (welcome credit excluded) ever observed. Never decreases. */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  earningsHighWater: number;

  @Column({ type: 'timestamp', nullable: true })
  lastEarningsIncreaseAt: Date | null;

  /** Bumped on every "welcome back", so the inactive track can run again later. */
  @Column({ type: 'integer', default: 0 })
  inactiveCycle: number;

  /** Set when the 30-day inactive email is sent; cleared on welcome back. */
  @Column({ type: 'timestamp', nullable: true })
  inactiveTrackStartedAt: Date | null;

  /** On the quiet list: no lifecycle emails until the partner logs in or refers again. */
  @Column({ type: 'timestamp', nullable: true })
  quietAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  unsubscribedAt: Date | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  unsubscribeSource: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastEvaluatedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
