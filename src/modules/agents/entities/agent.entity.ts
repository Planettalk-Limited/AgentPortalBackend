import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ReferralCode } from './referral-code.entity';
import { AgentEarnings } from './agent-earnings.entity';
import { AgentApplication } from './agent-application.entity';
import { Payout } from './payout.entity';

export enum AgentStatus {
  PENDING_APPLICATION = 'pending_application',
  APPLICATION_APPROVED = 'application_approved',
  CODE_GENERATED = 'code_generated',
  CREDENTIALS_SENT = 'credentials_sent',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum AgentTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

@Entity('agents')
@Index(['agentCode'], { unique: true })
@Index(['userId'], { unique: true })
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  agentCode: string;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.PENDING_APPLICATION,
  })
  status: AgentStatus;

  @Column({
    type: 'enum',
    enum: AgentTier,
    default: AgentTier.BRONZE,
  })
  tier: AgentTier;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  availableBalance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  pendingBalance: number;

  @Column({ type: 'integer', default: 0 })
  totalReferrals: number;

  @Column({ type: 'integer', default: 0 })
  activeReferrals: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00 })
  commissionRate: number; // Percentage

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  bankDetails: {
    bankName?: string;
    branchNameOrCode?: string;
    accountName?: string;
    accountNumberOrIban?: string;
    swiftBicCode?: string;
    currency?: string;
    bankCountry?: string;
    additionalNotes?: string;
    verifiedAt?: string;
    lastUpdatedAt?: string;
  };

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  activatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.agents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => ReferralCode, (referralCode) => referralCode.agent, {
    cascade: true,
  })
  referralCodes: ReferralCode[];

  @OneToMany(() => AgentEarnings, (earnings) => earnings.agent, {
    cascade: true,
  })
  earnings: AgentEarnings[];

  @OneToMany(() => AgentApplication, (application) => application.agent, {
    cascade: true,
  })
  applications: AgentApplication[];

  @OneToMany(() => Payout, (payout) => payout.agent, {
    cascade: true,
  })
  payouts: Payout[];

  // Virtual fields
  get isActive(): boolean {
    return this.status === AgentStatus.ACTIVE;
  }

  get canGenerateReferralCode(): boolean {
    return [
      AgentStatus.ACTIVE,
      AgentStatus.CODE_GENERATED,
      AgentStatus.CREDENTIALS_SENT,
    ].includes(this.status);
  }
}