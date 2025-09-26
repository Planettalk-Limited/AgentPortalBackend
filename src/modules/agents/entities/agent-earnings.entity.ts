import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from './agent.entity';
import { ReferralUsage } from './referral-usage.entity';

export enum EarningType {
  REFERRAL_COMMISSION = 'referral_commission',
  BONUS = 'bonus',
  PENALTY = 'penalty',
  ADJUSTMENT = 'adjustment',
  PROMOTION_BONUS = 'promotion_bonus',
}

export enum EarningStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

@Entity('agent_earnings')
@Index(['agentId'])
@Index(['type'])
@Index(['status'])
@Index(['earnedAt'])
export class AgentEarnings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EarningType,
    default: EarningType.REFERRAL_COMMISSION,
  })
  type: EarningType;

  @Column({
    type: 'enum',
    enum: EarningStatus,
    default: EarningStatus.PENDING,
  })
  status: EarningStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceId: string; // External transaction ID

  @Column({ type: 'timestamp' })
  earnedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentReference: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, (agent) => agent.earnings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ type: 'uuid', nullable: true })
  referralUsageId: string;

  @ManyToOne(() => ReferralUsage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referralUsageId' })
  referralUsage: ReferralUsage;

  // Virtual fields
  get isPaid(): boolean {
    return this.status === EarningStatus.PAID;
  }

  get isPending(): boolean {
    return this.status === EarningStatus.PENDING;
  }

  get isConfirmed(): boolean {
    return this.status === EarningStatus.CONFIRMED;
  }
}
