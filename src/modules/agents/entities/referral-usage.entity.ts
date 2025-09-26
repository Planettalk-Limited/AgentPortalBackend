import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ReferralCode } from './referral-code.entity';
import { User } from '../../users/entities/user.entity';

export enum ReferralUsageStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('referral_usages')
@Index(['referralCodeId'])
@Index(['referredUserId'])
@Index(['createdAt'])
export class ReferralUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReferralUsageStatus,
    default: ReferralUsageStatus.PENDING,
  })
  status: ReferralUsageStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referredUserEmail: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referredUserName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  referredUserPhone: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  commissionEarned: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @Column({ type: 'uuid', nullable: true })
  referralCodeId: string;

  @ManyToOne(() => ReferralCode, (referralCode) => referralCode.usages, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'referralCodeId' })
  referralCode: ReferralCode;

  @Column({ type: 'uuid', nullable: true })
  referredUserId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referredUserId' })
  referredUser: User;

  // Virtual fields
  get isConfirmed(): boolean {
    return this.status === ReferralUsageStatus.CONFIRMED;
  }

  get isPending(): boolean {
    return this.status === ReferralUsageStatus.PENDING;
  }
}
