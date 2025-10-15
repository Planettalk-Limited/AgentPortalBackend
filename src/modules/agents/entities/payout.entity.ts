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
import { User } from '../../users/entities/user.entity';

export enum PayoutStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REVIEW = 'review',
}

export enum PayoutMethod {
  BANK_TRANSFER = 'bank_transfer',
  PLANETTALK_CREDIT = 'planettalk_credit', // Replaces airtime_topup
}

@Entity('payouts')
@Index(['agentId'])
@Index(['status'])
@Index(['requestedAt'])
@Index(['processedAt'])
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.PENDING,
  })
  status: PayoutStatus;

  @Column({
    type: 'enum',
    enum: PayoutMethod,
    default: PayoutMethod.BANK_TRANSFER,
  })
  method: PayoutMethod;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  fees: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  netAmount: number; // amount - fees

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  paymentDetails: {
    bankAccount?: {
      bankName: string;
      branchNameOrCode?: string;
      accountName: string;
      accountNumberOrIban: string;
      swiftBicCode?: string;
      currency: string;
      bankCountry: string;
      additionalNotes?: string;
    };
    planettalkCredit?: {
      planettalkMobile: string; // PlanetTalk associated mobile number
      accountName?: string;
    };
  };

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionId: string; // External payment processor transaction ID

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'text', nullable: true })
  reviewMessage: string; // Message when status is set to review

  @Column({ type: 'timestamp' })
  requestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, (agent) => agent.payouts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ type: 'uuid', nullable: true })
  processedBy: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processedBy' })
  processor: User;

  // Virtual fields
  get isPending(): boolean {
    return this.status === PayoutStatus.PENDING;
  }

  get isApproved(): boolean {
    return this.status === PayoutStatus.APPROVED;
  }

  get needsReview(): boolean {
    return this.status === PayoutStatus.REVIEW;
  }

  // Removed isRejected method as REJECTED status is no longer supported

  get canBeProcessed(): boolean {
    return this.status === PayoutStatus.APPROVED;
  }

  get canBeApproved(): boolean {
    return [PayoutStatus.PENDING, PayoutStatus.REVIEW].includes(this.status);
  }

  get canBeReviewed(): boolean {
    return this.status === PayoutStatus.PENDING;
  }

  get processingTime(): number | null {
    if (!this.requestedAt || !this.approvedAt) return null;
    return this.approvedAt.getTime() - this.requestedAt.getTime();
  }
}
