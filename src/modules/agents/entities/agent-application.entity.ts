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

export enum ApplicationStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING_DOCUMENTS = 'pending_documents',
  WITHDRAWN = 'withdrawn',
}

export enum ApplicationSource {
  WEB_FORM = 'web_form',
  REFERRAL = 'referral',
  DIRECT_CONTACT = 'direct_contact',
  SOCIAL_MEDIA = 'social_media',
  OTHER = 'other',
}

@Entity('agent_applications')
@Index(['agentId'])
@Index(['status'])
@Index(['submittedAt'])
export class AgentApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.SUBMITTED,
  })
  status: ApplicationStatus;

  @Column({
    type: 'enum',
    enum: ApplicationSource,
    default: ApplicationSource.WEB_FORM,
  })
  source: ApplicationSource;

  // Personal Information
  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  zipCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  // Professional Information
  @Column({ type: 'text', nullable: true })
  experience: string;

  @Column({ type: 'text', nullable: true })
  motivation: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  currentEmployment: string;

  @Column({ type: 'boolean', default: false })
  hasLicense: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  licenseNumber: string;

  @Column({ type: 'date', nullable: true })
  licenseExpiryDate: Date;

  // Documents
  @Column({ type: 'json', nullable: true })
  documents: {
    resume?: string;
    license?: string;
    identification?: string;
    other?: string[];
  };

  // Review Information
  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'timestamp' })
  submittedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @Column({ type: 'uuid', nullable: true })
  agentId: string;

  @ManyToOne(() => Agent, (agent) => agent.applications, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: User;

  // Virtual fields
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isApproved(): boolean {
    return this.status === ApplicationStatus.APPROVED;
  }

  get isRejected(): boolean {
    return this.status === ApplicationStatus.REJECTED;
  }

  get isPendingReview(): boolean {
    return [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
    ].includes(this.status);
  }
}
