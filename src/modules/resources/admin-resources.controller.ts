import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto, ResourceQueryDto } from './dto/update-resource.dto';
import { Resource } from './entities/resource.entity';

@ApiTags('Admin - Resource Management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/resources')
export class AdminResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post('upload')
  @ApiOperation({ 
    summary: 'Upload new resource (Admin only)',
    description: 'Upload a file and create a new resource with metadata. Supports documents, images, videos, and archives.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Resource file and metadata',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 100MB)',
        },
        title: {
          type: 'string',
          description: 'Resource title',
          example: 'Agent Training Manual v2.1',
        },
        description: {
          type: 'string',
          description: 'Resource description',
          example: 'Comprehensive training manual for new agents',
        },
        type: {
          type: 'string',
          enum: ['document', 'image', 'video', 'audio', 'archive', 'other'],
          description: 'Resource type',
        },
        category: {
          type: 'string',
          enum: ['training', 'marketing', 'compliance', 'announcement', 'policy', 'guide', 'template', 'other'],
          description: 'Resource category',
        },
        visibility: {
          type: 'string',
          enum: ['public', 'private', 'restricted'],
          description: 'Resource visibility',
          default: 'public',
        },
        isFeatured: {
          type: 'boolean',
          description: 'Whether resource is featured',
          default: false,
        },
        publishedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Publication date',
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          description: 'Expiration date',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Resource tags',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata',
        },
      },
      required: ['file', 'title', 'type', 'category'],
    },
  })
  @ApiResponse({ status: 201, description: 'Resource uploaded successfully', type: Resource })
  @ApiResponse({ status: 400, description: 'Invalid file or metadata' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadResource(
    @UploadedFile() file: Express.Multer.File,
    @Body() createResourceDto: CreateResourceDto,
    @Request() req: any
  ): Promise<Resource> {
    // File is optional for embedded or external resources
    if (!file && !createResourceDto.isEmbedded && !createResourceDto.isExternal) {
      throw new BadRequestException('File is required for uploaded resources');
    }

    return this.resourcesService.uploadResource(file, createResourceDto, req.user.id);
  }

  @Post('create-link')
  @ApiOperation({ 
    summary: 'Create external link or embedded content resource (Admin only)',
    description: 'Create a resource that links to external content (like YouTube videos) or contains embedded text content'
  })
  @ApiBody({
    description: 'Resource metadata for external or embedded content',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Agent Training Video Series' },
        description: { type: 'string', example: 'Comprehensive video training series hosted on YouTube' },
        type: { type: 'string', enum: ['document', 'image', 'video', 'audio', 'archive', 'other'] },
        category: { type: 'string', enum: ['training', 'marketing', 'compliance', 'announcement', 'policy', 'guide', 'template', 'bank_forms', 'terms_conditions', 'media', 'other'] },
        visibility: { type: 'string', enum: ['public', 'private', 'restricted'], default: 'public' },
        isExternal: { type: 'boolean', description: 'True for external links' },
        externalUrl: { type: 'string', example: 'https://youtube.com/watch?v=training-video' },
        isEmbedded: { type: 'boolean', description: 'True for embedded text content' },
        embeddedContent: { type: 'string', example: 'HTML or text content to display inline' },
        isFeatured: { type: 'boolean', default: false },
        tags: { type: 'array', items: { type: 'string' } },
        metadata: { type: 'object' }
      },
      required: ['title', 'type', 'category']
    }
  })
  @ApiResponse({ status: 201, description: 'Resource created successfully', type: Resource })
  @ApiResponse({ status: 400, description: 'Invalid resource data' })
  async createLinkOrEmbeddedResource(
    @Body() createResourceDto: CreateResourceDto,
    @Request() req: any
  ): Promise<Resource> {
    return this.resourcesService.uploadResource(null, createResourceDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resources with filtering (Admin)' })
  @ApiResponse({ status: 200, description: 'List of resources with pagination' })
  async findAll(@Query() query: ResourceQueryDto) {
    return this.resourcesService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get resource statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Resource statistics and analytics' })
  async getStats() {
    return this.resourcesService.getResourceStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Resource details', type: Resource })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<Resource> {
    return this.resourcesService.findOne(id, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update resource metadata (Admin)' })
  @ApiResponse({ status: 200, description: 'Resource updated successfully', type: Resource })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async update(
    @Param('id') id: string,
    @Body() updateResourceDto: UpdateResourceDto
  ): Promise<Resource> {
    return this.resourcesService.update(id, updateResourceDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete resource (Admin)', 
    description: 'Permanently deletes resource file from storage and database record'
  })
  @ApiResponse({ status: 200, description: 'Resource deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }

  @Get(':id/download-url')
  @ApiOperation({ 
    summary: 'Get presigned download URL (Admin)',
    description: 'Generate a secure, time-limited URL for downloading the resource file'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Presigned URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Presigned download URL' },
        expiresIn: { type: 'number', description: 'URL expiration time in seconds' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async getDownloadUrl(@Param('id') id: string, @Request() req: any) {
    return this.resourcesService.getPresignedUrl(id, req.user.role);
  }

  @Post(':id/toggle-featured')
  @ApiOperation({ summary: 'Toggle resource featured status (Admin)' })
  @ApiResponse({ status: 200, description: 'Featured status updated', type: Resource })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async toggleFeatured(@Param('id') id: string): Promise<Resource> {
    const resource = await this.resourcesService.findOne(id);
    return this.resourcesService.update(id, { isFeatured: !resource.isFeatured });
  }

  @Post(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle resource active status (Admin)' })
  @ApiResponse({ status: 200, description: 'Active status updated', type: Resource })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async toggleActive(@Param('id') id: string): Promise<Resource> {
    const resource = await this.resourcesService.findOne(id);
    return this.resourcesService.update(id, { isActive: !resource.isActive });
  }

  @Post('bulk-update')
  @ApiOperation({ 
    summary: 'Bulk update resources (Admin)',
    description: 'Update multiple resources at once with the same properties'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resourceIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of resource IDs to update',
        },
        updates: {
          type: 'object',
          description: 'Properties to update',
          properties: {
            visibility: { type: 'string', enum: ['public', 'private', 'restricted'] },
            isActive: { type: 'boolean' },
            isFeatured: { type: 'boolean' },
            category: { type: 'string' },
          },
        },
      },
      required: ['resourceIds', 'updates'],
    },
  })
  @ApiResponse({ status: 200, description: 'Bulk update completed' })
  async bulkUpdate(
    @Body() bulkUpdateDto: { resourceIds: string[]; updates: Partial<UpdateResourceDto> }
  ) {
    const results = await Promise.allSettled(
      bulkUpdateDto.resourceIds.map(id =>
        this.resourcesService.update(id, bulkUpdateDto.updates)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: true,
      message: `Bulk update completed: ${successful} successful, ${failed} failed`,
      successful,
      failed,
      total: bulkUpdateDto.resourceIds.length,
    };
  }

  @Delete('bulk-delete')
  @ApiOperation({ 
    summary: 'Bulk delete resources (Admin)',
    description: 'Delete multiple resources at once'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resourceIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of resource IDs to delete',
        },
      },
      required: ['resourceIds'],
    },
  })
  @ApiResponse({ status: 200, description: 'Bulk delete completed' })
  async bulkDelete(@Body() bulkDeleteDto: { resourceIds: string[] }) {
    const results = await Promise.allSettled(
      bulkDeleteDto.resourceIds.map(id => this.resourcesService.remove(id))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: true,
      message: `Bulk delete completed: ${successful} successful, ${failed} failed`,
      successful,
      failed,
      total: bulkDeleteDto.resourceIds.length,
    };
  }

  @Post(':id/notify-agents')
  @ApiOperation({ 
    summary: 'Manually notify agents about a resource (Admin)',
    description: 'Send notifications to all agents about a specific resource'
  })
  @ApiResponse({ status: 200, description: 'Notifications sent successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  async notifyAgentsAboutResource(@Param('id') id: string) {
    return this.resourcesService.sendResourceNotification(id);
  }
}
