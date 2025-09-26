import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TrainingMaterial } from './training-material.entity';

@Entity('training_completions')
@Index(['userId', 'trainingMaterialId'])
@Index(['completedAt'])
@Unique(['userId', 'trainingMaterialId'])
export class TrainingCompletion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  @Index()
  trainingMaterialId: string;

  @ManyToOne(() => TrainingMaterial, trainingMaterial => trainingMaterial.completions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trainingMaterialId' })
  trainingMaterial: TrainingMaterial;

  @Column({ type: 'timestamptz' })
  completedAt: Date;

  @Column({ type: 'int', nullable: true })
  timeSpentMinutes: number;

  @Column({ type: 'float', nullable: true })
  score: number;

  @Column({ type: 'int', nullable: true })
  attempts: number;

  @Column('text', { nullable: true })
  notes: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
