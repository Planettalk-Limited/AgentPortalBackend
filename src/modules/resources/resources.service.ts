import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, IsNull, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { Resource, ResourceType, ResourceCategory, ResourceVisibility } from './entities/resource.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto, ResourceQueryDto } from './dto/update-resource.dto';
import { S3Service } from './services/s3.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationPriority } from '../notifications/entities/notification.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private resourcesRepository: Repository<Resource>,
    private s3Service: S3Service,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  /**
   * Upload and create a new resource (Admin only)
   */
  async uploadResource(
    file: Express.Multer.File,
    createResourceDto: CreateResourceDto,
    uploadedById: string
  ): Promise<Resource> {
    // Handle different resource types
    if (createResourceDto.isEmbedded && !createResourceDto.embeddedContent) {
      throw new BadRequestException('Embedded content is required for embedded resources');
    }

    if (createResourceDto.isExternal && !createResourceDto.externalUrl) {
      throw new BadRequestException('External URL is required for external resources');
    }

    let uploadResult = null;
    
    // Only upload file if it's not embedded or external
    if (!createResourceDto.isEmbedded && !createResourceDto.isExternal) {
      if (!file) {
        throw new BadRequestException('File is required for uploaded resources');
      }

      // Validate file
      const validation = this.s3Service.validateFile(file, 100); // 100MB limit
      if (!validation.valid) {
        throw new BadRequestException(validation.error);
      }

      try {
        // Upload to S3
        uploadResult = await this.s3Service.uploadFile(file, 'resources');
      } catch (error) {
        throw new BadRequestException(`Failed to upload resource: ${error.message}`);
      }
    }

    // Determine resource type
    let resourceType = createResourceDto.type;
    if (!resourceType && file) {
      resourceType = this.s3Service.getFileTypeFromMimeType(file.mimetype) as ResourceType;
    }

    // Create resource record
    const resource = this.resourcesRepository.create({
      ...createResourceDto,
      type: resourceType,
      fileName: uploadResult?.fileName || null,
      originalName: uploadResult?.originalName || createResourceDto.title,
      mimeType: uploadResult?.mimeType || (createResourceDto.isEmbedded ? 'text/plain' : 'application/octet-stream'),
      fileSize: uploadResult?.size || 0,
      s3Key: uploadResult?.key || null,
      s3Url: uploadResult?.url || null,
      s3Bucket: uploadResult?.bucket || null,
      uploadedById,
      publishedAt: createResourceDto.publishedAt ? new Date(createResourceDto.publishedAt) : new Date(),
      expiresAt: createResourceDto.expiresAt ? new Date(createResourceDto.expiresAt) : null,
    });

    const savedResource = await this.resourcesRepository.save(resource);

    // Note: Automatic notifications disabled - admins can manually notify agents if needed
    // if (savedResource.visibility === ResourceVisibility.PUBLIC && savedResource.isActive) {
    //   await this.notifyAgentsOfNewResource(savedResource);
    // }

    return savedResource;
  }

  /**
   * Get all resources with filtering (Admin)
   */
  async findAll(query: ResourceQueryDto): Promise<{
    resources: Resource[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      category,
      type,
      visibility,
      isActive,
      isFeatured,
      search,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.resourcesRepository
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.uploadedBy', 'uploadedBy');

    // Apply filters
    if (category) {
      queryBuilder.andWhere('resource.category = :category', { category });
    }

    if (type) {
      queryBuilder.andWhere('resource.type = :type', { type });
    }

    if (visibility) {
      queryBuilder.andWhere('resource.visibility = :visibility', { visibility });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('resource.isActive = :isActive', { isActive });
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere('resource.isFeatured = :isFeatured', { isFeatured });
    }

    if (search) {
      queryBuilder.andWhere(
        '(resource.title ILIKE :search OR resource.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim());
      queryBuilder.andWhere('resource.tags && :tags', { tags: tagList });
    }

    // Apply sorting
    const allowedSortFields = ['createdAt', 'title', 'category', 'type', 'downloadCount', 'viewCount'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`resource.${sortField}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [resources, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      resources,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get public resources for agents
   */
  async findPublicResources(query: ResourceQueryDto): Promise<{
    resources: Resource[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const modifiedQuery = {
      ...query,
      visibility: ResourceVisibility.PUBLIC,
      isActive: true,
    };

    const result = await this.findAll(modifiedQuery);
    
    // Filter out expired resources for agents
    result.resources = result.resources.filter(resource => !resource.isExpired);
    
    return result;
  }

  /**
   * Get featured resources for agents
   */
  async getFeaturedResources(limit: number = 5): Promise<Resource[]> {
    return this.resourcesRepository.find({
      where: {
        visibility: ResourceVisibility.PUBLIC,
        isActive: true,
        isFeatured: true,
        expiresAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['uploadedBy'],
    });
  }

  /**
   * Get resource by ID
   */
  async findOne(id: string, userRole?: UserRole): Promise<Resource> {
    const resource = await this.resourcesRepository.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Check access permissions
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.PT_ADMIN) {
      if (resource.visibility !== ResourceVisibility.PUBLIC || !resource.isActive || resource.isExpired) {
        throw new ForbiddenException('Access denied to this resource');
      }
    }

    return resource;
  }

  /**
   * Update resource
   */
  async update(id: string, updateResourceDto: UpdateResourceDto): Promise<Resource> {
    const resource = await this.findOne(id);

    // Update dates if provided
    if (updateResourceDto.publishedAt) {
      updateResourceDto.publishedAt = new Date(updateResourceDto.publishedAt) as any;
    }
    if (updateResourceDto.expiresAt) {
      updateResourceDto.expiresAt = new Date(updateResourceDto.expiresAt) as any;
    }

    Object.assign(resource, updateResourceDto);
    
    const updatedResource = await this.resourcesRepository.save(resource);

    // Note: Automatic notifications disabled - admins can manually notify agents if needed
    // if (updateResourceDto.visibility === ResourceVisibility.PUBLIC && 
    //     updateResourceDto.isActive && 
    //     resource.visibility !== ResourceVisibility.PUBLIC) {
    //   await this.notifyAgentsOfNewResource(updatedResource);
    // }

    return updatedResource;
  }

  /**
   * Delete resource
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const resource = await this.findOne(id);

    try {
      // Delete from S3
      const deleted = await this.s3Service.deleteFile(resource.s3Key);
      if (!deleted) {
        console.warn(`Failed to delete file from S3: ${resource.s3Key}`);
      }

      // Delete from database
      await this.resourcesRepository.remove(resource);

      return {
        success: true,
        message: 'Resource deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete resource: ${error.message}`);
    }
  }

  /**
   * Get presigned URL for secure access
   */
  async getPresignedUrl(id: string, userRole?: UserRole): Promise<{ url: string; expiresIn: number }> {
    const resource = await this.findOne(id, userRole);

    try {
      const expiresIn = 3600; // 1 hour
      const url = await this.s3Service.getPresignedUrl(resource.s3Key, expiresIn);

      // Increment view count
      await this.resourcesRepository.increment({ id }, 'viewCount', 1);

      return { url, expiresIn };
    } catch (error) {
      throw new BadRequestException(`Failed to generate download URL: ${error.message}`);
    }
  }

  /**
   * Download resource (increment download count)
   */
  async downloadResource(id: string, userRole?: UserRole): Promise<{ url: string; fileName: string }> {
    const resource = await this.findOne(id, userRole);

    try {
      const url = await this.s3Service.getPresignedUrl(resource.s3Key, 300); // 5 minutes

      // Increment download count
      await this.resourcesRepository.increment({ id }, 'downloadCount', 1);

      return {
        url,
        fileName: resource.originalName,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate download URL: ${error.message}`);
    }
  }

  /**
   * Get resource statistics
   */
  async getResourceStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    totalDownloads: number;
    totalViews: number;
    recentUploads: number;
  }> {
    const [
      total,
      byCategory,
      byType,
      downloadStats,
      viewStats,
      recentUploads,
    ] = await Promise.all([
      this.resourcesRepository.count({ where: { isActive: true } }),
      
      this.resourcesRepository
        .createQueryBuilder('resource')
        .select('resource.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('resource.isActive = true')
        .groupBy('resource.category')
        .getRawMany(),

      this.resourcesRepository
        .createQueryBuilder('resource')
        .select('resource.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('resource.isActive = true')
        .groupBy('resource.type')
        .getRawMany(),

      this.resourcesRepository
        .createQueryBuilder('resource')
        .select('SUM(resource.downloadCount)', 'total')
        .where('resource.isActive = true')
        .getRawOne(),

      this.resourcesRepository
        .createQueryBuilder('resource')
        .select('SUM(resource.viewCount)', 'total')
        .where('resource.isActive = true')
        .getRawOne(),

      this.resourcesRepository.count({
        where: {
          isActive: true,
          createdAt: Not(IsNull()),
        },
      }),
    ]);

    return {
      total,
      byCategory: byCategory.reduce((acc, item) => ({ ...acc, [item.category]: parseInt(item.count) }), {}),
      byType: byType.reduce((acc, item) => ({ ...acc, [item.type]: parseInt(item.count) }), {}),
      totalDownloads: parseInt(downloadStats?.total || '0'),
      totalViews: parseInt(viewStats?.total || '0'),
      recentUploads,
    };
  }

  /**
   * Get organized media resources for agents
   */
  async getAgentMediaResources(query: ResourceQueryDto = {}): Promise<{
    trainingMaterials: Resource[];
    bankForms: Resource[];
    termsAndConditions: Resource[];
    compliance: Resource[];
    marketing: Resource[];
    policies: Resource[];
    guides: Resource[];
    templates: Resource[];
    media: Resource[];
    announcements: Resource[];
    other: Resource[];
    summary: {
      totalResources: number;
      newThisMonth: number;
      featuredCount: number;
    };
  }> {
    const baseQuery = { ...query, limit: 50 }; // Reasonable limit for each category

    const [
      trainingMaterials,
      bankForms,
      termsAndConditions,
      compliance,
      marketing,
      policies,
      guides,
      templates,
      media,
      announcements,
      other,
      stats,
    ] = await Promise.all([
      this.findPublicResources({ ...baseQuery, category: ResourceCategory.TRAINING }),
      this.findPublicResources({ ...baseQuery, category: ResourceCategory.BANK_FORMS }),
      this.findPublicResources({ ...baseQuery, category: ResourceCategory.TERMS_CONDITIONS }),
      this.findPublicResources({ ...baseQuery, category: ResourceCategory.COMPLIANCE }),
      this.findPublicResources({ ...baseQuery, category: ResourceCategory.MARKETING }),
      this.findPublicResources({ ...baseQuery, category: ResourceCategory.POLICY }),
      this.findPublicResources({ ...baseQuery, category: ResourceCategory.GUIDE }),
      this.findPublicResources({ ...baseQuery, category: ResourceCategory.TEMPLATE }),
      this.findPublicResources({ ...baseQuery, category: ResourceCategory.MEDIA }),
      this.findPublicResources({ ...baseQuery, category: ResourceCategory.ANNOUNCEMENT }),
      this.findPublicResources({ ...baseQuery, category: ResourceCategory.OTHER }),
      this.getResourceStats(),
    ]);

    // Calculate new resources this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const newThisMonth = await this.resourcesRepository.count({
      where: {
        visibility: ResourceVisibility.PUBLIC,
        isActive: true,
        createdAt: Not(IsNull()),
      },
    });

    const featuredCount = await this.resourcesRepository.count({
      where: {
        visibility: ResourceVisibility.PUBLIC,
        isActive: true,
        isFeatured: true,
      },
    });

    return {
      trainingMaterials: trainingMaterials.resources,
      bankForms: bankForms.resources,
      termsAndConditions: termsAndConditions.resources,
      compliance: compliance.resources,
      marketing: marketing.resources,
      policies: policies.resources,
      guides: guides.resources,
      templates: templates.resources,
      media: media.resources,
      announcements: announcements.resources,
      other: other.resources,
      summary: {
        totalResources: stats.total,
        newThisMonth,
        featuredCount,
      },
    };
  }

  /**
   * Get resource content based on type (embedded, external, or file)
   */
  async getResourceContent(id: string, userRole?: UserRole): Promise<{
    type: 'embedded' | 'external' | 'file';
    content?: string;
    url?: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    expiresIn?: number;
  }> {
    const resource = await this.findOne(id, userRole);

    // Increment view count
    await this.resourcesRepository.increment({ id }, 'viewCount', 1);

    if (resource.isEmbedded && resource.embeddedContent) {
      return {
        type: 'embedded',
        content: resource.embeddedContent,
        mimeType: 'text/html',
      };
    }

    if (resource.isExternal && resource.externalUrl) {
      return {
        type: 'external',
        url: resource.externalUrl,
      };
    }

    // File-based resource
    if (resource.s3Key) {
      try {
        const expiresIn = 3600; // 1 hour
        const url = await this.s3Service.getPresignedUrl(resource.s3Key, expiresIn);

        return {
          type: 'file',
          url,
          fileName: resource.originalName,
          mimeType: resource.mimeType,
          fileSize: resource.fileSize,
          expiresIn,
        };
      } catch (error) {
        throw new BadRequestException(`Failed to generate access URL: ${error.message}`);
      }
    }

    throw new BadRequestException('Resource has no accessible content');
  }

  /**
   * Track resource access for compliance
   */
  async trackResourceAccess(resourceId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const resource = await this.findOne(resourceId);
      
      // Log access in metadata
      const currentMetadata = resource.metadata || {};
      const accessLog = currentMetadata.accessLog || [];
      
      accessLog.push({
        userId,
        accessedAt: new Date().toISOString(),
        ipAddress: 'unknown', // Could be enhanced to capture IP
        userAgent: 'unknown', // Could be enhanced to capture user agent
      });

      // Keep only last 100 access records per resource
      if (accessLog.length > 100) {
        accessLog.splice(0, accessLog.length - 100);
      }

      resource.metadata = {
        ...currentMetadata,
        accessLog,
        lastAccessedAt: new Date().toISOString(),
      };

      await this.resourcesRepository.save(resource);

      return {
        success: true,
        message: 'Resource access tracked successfully',
      };
    } catch (error) {
      console.error('Failed to track resource access:', error);
      return {
        success: false,
        message: 'Failed to track access',
      };
    }
  }

  /**
   * Manually send notification about a resource to agents
   */
  async sendResourceNotification(resourceId: string): Promise<{ success: boolean; message: string; notificationsSent: number }> {
    const resource = await this.findOne(resourceId);
    
    if (resource.visibility !== ResourceVisibility.PUBLIC || !resource.isActive) {
      throw new BadRequestException('Can only notify agents about public, active resources');
    }

    const notificationsSent = await this.notifyAgentsOfNewResource(resource);
    
    return {
      success: true,
      message: `Notifications sent to ${notificationsSent} agents about "${resource.title}"`,
      notificationsSent,
    };
  }

  /**
   * Notify agents of new resource (now returns count)
   */
  private async notifyAgentsOfNewResource(resource: Resource): Promise<number> {
    try {
      // Get all active agents
      const allUsers = await this.usersService.findAll();
      const agents = allUsers.filter(user => user.role === UserRole.AGENT && user.status === 'active');

      const notifications = agents.map(agent => ({
        userId: agent.id,
        type: NotificationType.ANNOUNCEMENT,
        title: `New ${resource.category} Resource Available`,
        message: `"${resource.title}" has been added to the resource library. ${resource.description ? resource.description.substring(0, 100) + '...' : 'Check it out now!'}`,
        priority: resource.isFeatured ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
        actionUrl: `/resources/${resource.id}`,
        actionText: 'View Resource',
        metadata: {
          resourceId: resource.id,
          resourceCategory: resource.category,
          resourceType: resource.type,
        },
      }));

      // Send notifications in batches
      const batchSize = 50;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        await Promise.all(
          batch.map(notification => 
            this.notificationsService.createNotification(notification)
          )
        );
      }
      
      return agents.length; // Return number of agents notified
    } catch (error) {
      console.error('Failed to send resource notifications:', error);
      return 0; // Return 0 if notifications failed
    }
  }
}
