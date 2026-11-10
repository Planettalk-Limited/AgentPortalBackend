import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export type LifecycleEmailStatus = 'pending' | 'sent' | 'failed' | 'suppressed';

/**
 * Send log: one row per partner per lifecycle email occurrence.
 *
 * The unique (agentId, dedupeKey) index is the once-only guarantee. A row is
 * inserted ("claimed") BEFORE the email is sent, so two overlapping runs, or a
 * re-run on the same day, cannot both send it. Once-ever emails use the template
 * key as dedupe key (referrals_5, earnings_50); recurring ones add a period or
 * cycle (earnings_summary:2026-10, inactive_30:c0).
 */
@Entity('lifecycle_emails')
@Index('UQ_lifecycle_emails_agent_dedupe', ['agentId', 'dedupeKey'], { unique: true })
@Index('IDX_lifecycle_emails_template_sent', ['templateKey', 'sentAt'])
@Index('IDX_lifecycle_emails_message', ['mailgunMessageId'])
export class LifecycleEmail {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_lifecycle_emails' })
  id: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId', foreignKeyConstraintName: 'FK_lifecycle_emails_agent' })
  agent?: Agent;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 64 })
  templateKey: string;

  @Column({ type: 'varchar', length: 128 })
  dedupeKey: string;

  @Column({ type: 'varchar', length: 32 })
  segment: string;

  @Column({ type: 'varchar', length: 16 })
  status: LifecycleEmailStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipient: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mailgunMessageId: string | null;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  firstOpenedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  firstClickedAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  openCount: number;

  @Column({ type: 'integer', default: 0 })
  clickCount: number;

  @Column({ type: 'timestamp', nullable: true })
  unsubscribedAt: Date | null;

  /** Set when the partner referred / came back within the attribution window after this email. */
  @Column({ type: 'timestamp', nullable: true })
  convertedAt: Date | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  conversionType: string | null;

  /** Why a row is suppressed, template data used, simulation flag, etc. */
  @Column({ type: 'json', nullable: true })
  context: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
