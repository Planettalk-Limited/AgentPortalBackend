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
import { User } from '../../users/entities/user.entity';

export enum ResourceType {
  DOCUMENT = 'document',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

export enum ResourceCategory {
  TRAINING = 'training',
  MARKETING = 'marketing',
  COMPLIANCE = 'compliance',
  ANNOUNCEMENT = 'announcement',
  POLICY = 'policy',
  GUIDE = 'guide',
  TEMPLATE = 'template',
  BANK_FORMS = 'bank_forms',
  TERMS_CONDITIONS = 'terms_conditions',
  MEDIA = 'media',
  OTHER = 'other',
}

export enum ResourceVisibility {
  PUBLIC = 'public', // All agents can see
  PRIVATE = 'private', // Only admin can see
  RESTRICTED = 'restricted', // Specific agents/roles
}

@Entity('resources')
@Index(['category'])
@Index(['type'])
@Index(['visibility'])
@Index(['isActive'])
@Index(['createdAt'])
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  originalName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({
    type: 'enum',
    enum: ResourceType,
    default: ResourceType.DOCUMENT,
  })
  type: ResourceType;

  @Column({
    type: 'enum',
    enum: ResourceCategory,
    default: ResourceCategory.OTHER,
  })
  category: ResourceCategory;

  @Column({
    type: 'enum',
    enum: ResourceVisibility,
    default: ResourceVisibility.PUBLIC,
  })
  visibility: ResourceVisibility;

  @Column({ type: 'text', nullable: true })
  s3Key: string; // S3 object key

  @Column({ type: 'text', nullable: true })
  s3Url: string; // S3 URL

  @Column({ type: 'varchar', length: 100, nullable: true })
  s3Bucket: string;

  @Column({ type: 'text', nullable: true })
  externalUrl: string; // For externally hosted content (videos, etc.)

  @Column({ type: 'text', nullable: true })
  embeddedContent: string; // For text content that can be displayed inline

  @Column({ type: 'boolean', default: false })
  isEmbedded: boolean; // Whether content is embedded vs file/external

  @Column({ type: 'boolean', default: false })
  isExternal: boolean; // Whether content is hosted externally

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @Column({ type: 'uuid' })
  uploadedById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  // Virtual fields
  get fileExtension(): string {
    return this.fileName.split('.').pop()?.toLowerCase() || '';
  }

  get fileSizeFormatted(): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isPublished(): boolean {
    return this.publishedAt ? new Date() >= this.publishedAt : false;
  }
}
