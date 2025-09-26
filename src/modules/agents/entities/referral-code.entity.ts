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
import { Agent } from './agent.entity';
import { ReferralUsage } from './referral-usage.entity';

export enum ReferralCodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

export enum ReferralCodeType {
  STANDARD = 'standard',
  PROMOTIONAL = 'promotional',
  LIMITED_TIME = 'limited_time',
  VIP = 'vip',
}

@Entity('referral_codes')
@Index(['code'], { unique: true })
@Index(['agentId'])
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: ReferralCodeStatus,
    default: ReferralCodeStatus.ACTIVE,
  })
  status: ReferralCodeStatus;

  @Column({
    type: 'enum',
    enum: ReferralCodeType,
    default: ReferralCodeType.STANDARD,
  })
  type: ReferralCodeType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  bonusCommissionRate: number; // Additional commission for this code

  @Column({ type: 'integer', nullable: true })
  maxUses: number; // Null = unlimited

  @Column({ type: 'integer', default: 0 })
  currentUses: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, (agent) => agent.referralCodes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @OneToMany(() => ReferralUsage, (usage) => usage.referralCode, {
    cascade: true,
  })
  usages: ReferralUsage[];

  // Virtual fields
  get isActive(): boolean {
    return (
      this.status === ReferralCodeStatus.ACTIVE &&
      (!this.expiresAt || this.expiresAt > new Date()) &&
      (!this.maxUses || this.currentUses < this.maxUses)
    );
  }

  get remainingUses(): number | null {
    if (!this.maxUses) return null;
    return Math.max(0, this.maxUses - this.currentUses);
  }

  get usageRate(): number {
    if (!this.maxUses) return 0;
    return (this.currentUses / this.maxUses) * 100;
  }
}
