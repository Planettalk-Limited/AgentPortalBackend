import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

/**
 * Partner moments the dashboard counts: a referral milestone crossed, or a comeback
 * from the inactive track / quiet list. Recorded by the daily run whether or not an
 * email went out (draft copy, the daily cap and opt-outs do not hide them). The
 * unique (agentId, dedupeKey) index keeps each moment to one row.
 */
@Entity('partner_lifecycle_events')
@Index('UQ_partner_lifecycle_events_agent_dedupe', ['agentId', 'dedupeKey'], { unique: true })
@Index('IDX_partner_lifecycle_events_type_occurred', ['type', 'occurredAt'])
export class PartnerLifecycleEvent {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_partner_lifecycle_events' })
  id: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId', foreignKeyConstraintName: 'FK_partner_lifecycle_events_agent' })
  agent?: Agent;

  /** 'referral_milestone' | 'comeback' */
  @Column({ type: 'varchar', length: 32 })
  type: string;

  /** referral_milestone:<n> or comeback:c<cycle> */
  @Column({ type: 'varchar', length: 64 })
  dedupeKey: string;

  /** The milestone for referral_milestone; null otherwise. */
  @Column({ type: 'integer', nullable: true })
  value: number | null;

  @Column({ type: 'timestamp' })
  occurredAt: Date;

  /** comeback: { from, lastEmail, lastEmailSentAt } */
  @Column({ type: 'json', nullable: true })
  context: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
