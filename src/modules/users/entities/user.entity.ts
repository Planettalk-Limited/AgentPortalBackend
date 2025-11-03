import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

export enum UserRole {
  ADMIN = 'admin',
  PT_ADMIN = 'pt_admin',
  AGENT = 'agent',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 2 })
  country: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.AGENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt: Date;

  @Column({ type: 'boolean', default: false })
  isFirstLogin: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Agent, (agent) => agent.user, { cascade: true })
  agents: Agent[];

  // Virtual fields
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isAgent(): boolean {
    return this.role === UserRole.AGENT;
  }

  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.PT_ADMIN;
  }
}