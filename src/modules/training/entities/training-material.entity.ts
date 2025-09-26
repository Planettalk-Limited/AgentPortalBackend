import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { TrainingCompletion } from './training-completion.entity';

export enum TrainingType {
  ONBOARDING = 'onboarding',
  COMPLIANCE = 'compliance',
  PRODUCT = 'product',
  SALES = 'sales',
  POLICY = 'policy',
  CHECKLIST = 'checklist',
}

export enum TrainingStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('training_materials')
@Index(['type', 'status'])
@Index(['required', 'status'])
export class TrainingMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: TrainingType,
    default: TrainingType.ONBOARDING,
  })
  type: TrainingType;

  @Column({
    type: 'enum',
    enum: TrainingStatus,
    default: TrainingStatus.DRAFT,
  })
  status: TrainingStatus;

  @Column('text', { nullable: true })
  content: string;

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ nullable: true })
  documentUrl: string;

  @Column('simple-array', { nullable: true })
  attachments: string[];

  @Column({ default: false })
  required: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'int', nullable: true })
  estimatedMinutes: number;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  prerequisiteIds: string;

  @OneToMany(() => TrainingCompletion, completion => completion.trainingMaterial)
  completions: TrainingCompletion[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
