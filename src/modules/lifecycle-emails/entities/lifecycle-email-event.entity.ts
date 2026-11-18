import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { LifecycleEmail } from './lifecycle-email.entity';

/**
 * Raw Mailgun webhook events for lifecycle emails (delivered, opened, clicked,
 * unsubscribed, complained, failed). Mailgun retries webhooks, so the unique
 * event id makes processing idempotent.
 */
@Entity('lifecycle_email_events')
@Index('UQ_lifecycle_email_events_mailgun_id', ['mailgunEventId'], { unique: true })
@Index('IDX_lifecycle_email_events_email', ['lifecycleEmailId'])
export class LifecycleEmailEvent {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_lifecycle_email_events' })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  mailgunEventId: string;

  @Column({ type: 'uuid', nullable: true })
  lifecycleEmailId: string | null;

  @ManyToOne(() => LifecycleEmail, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'lifecycleEmailId', foreignKeyConstraintName: 'FK_lifecycle_email_events_email' })
  lifecycleEmail?: LifecycleEmail;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mailgunMessageId: string | null;

  @Column({ type: 'varchar', length: 32 })
  event: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipient: string | null;

  @Column({ type: 'text', nullable: true })
  url: string | null;

  @Column({ type: 'timestamp' })
  occurredAt: Date;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
