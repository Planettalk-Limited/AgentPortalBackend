import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { ResourcesService } from './resources.service';
import { ResourceQueryDto } from './dto/update-resource.dto';
import { Resource, ResourceCategory } from './entities/resource.entity';

@ApiTags('Agent Media & Resources')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('agents/media')
export class AgentMediaController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all media and resources for agent profile',
    description: 'Retrieve all public resources organized by category for the agent media section'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Media resources organized by category',
    schema: {
      type: 'object',
      properties: {
        trainingMaterials: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        bankForms: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        termsAndConditions: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        compliance: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        marketing: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        policies: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        guides: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        templates: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        media: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        announcements: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        other: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        summary: {
          type: 'object',
          properties: {
            totalResources: { type: 'number' },
            newThisMonth: { type: 'number' },
            featuredCount: { type: 'number' }
          }
        }
      }
    }
  })
  async getAllMedia(@Query() query: ResourceQueryDto, @Request() req: any) {
    return this.resourcesService.getAgentMediaResources(query);
  }

  @Get('training')
  @ApiOperation({ 
    summary: 'Get training materials',
    description: 'Retrieve all training materials including embedded content and external videos'
  })
  @ApiResponse({ status: 200, description: 'Training materials' })
  async getTrainingMaterials(@Query() query: ResourceQueryDto) {
    return this.resourcesService.findPublicResources({
      ...query,
      category: ResourceCategory.TRAINING,
    });
  }

  @Get('bank-forms')
  @ApiOperation({ 
    summary: 'Get bank update forms',
    description: 'Retrieve bank account update forms and related documents'
  })
  @ApiResponse({ status: 200, description: 'Bank forms and documents' })
  async getBankForms(@Query() query: ResourceQueryDto) {
    return this.resourcesService.findPublicResources({
      ...query,
      category: ResourceCategory.BANK_FORMS,
    });
  }

  @Get('terms-conditions')
  @ApiOperation({ 
    summary: 'Get Terms & Conditions documents',
    description: 'Retrieve Terms & Conditions and legal documents that agents can download'
  })
  @ApiResponse({ status: 200, description: 'Terms & Conditions documents' })
  async getTermsConditions(@Query() query: ResourceQueryDto) {
    return this.resourcesService.findPublicResources({
      ...query,
      category: ResourceCategory.TERMS_CONDITIONS,
    });
  }

  @Get('compliance')
  @ApiOperation({ 
    summary: 'Get compliance documents',
    description: 'Retrieve compliance documents and regulatory materials'
  })
  @ApiResponse({ status: 200, description: 'Compliance documents' })
  async getComplianceDocuments(@Query() query: ResourceQueryDto) {
    return this.resourcesService.findPublicResources({
      ...query,
      category: ResourceCategory.COMPLIANCE,
    });
  }

  @Get('marketing')
  @ApiOperation({ 
    summary: 'Get marketing materials',
    description: 'Retrieve marketing templates, guides, and promotional materials'
  })
  @ApiResponse({ status: 200, description: 'Marketing materials' })
  async getMarketingMaterials(@Query() query: ResourceQueryDto) {
    return this.resourcesService.findPublicResources({
      ...query,
      category: ResourceCategory.MARKETING,
    });
  }

  @Get('announcements')
  @ApiOperation({ 
    summary: 'Get announcements and updates',
    description: 'Retrieve company announcements and system updates'
  })
  @ApiResponse({ status: 200, description: 'Announcements and updates' })
  async getAnnouncements(@Query() query: ResourceQueryDto) {
    return this.resourcesService.findPublicResources({
      ...query,
      category: ResourceCategory.ANNOUNCEMENT,
    });
  }

  @Get('featured')
  @ApiOperation({ 
    summary: 'Get featured media content',
    description: 'Retrieve featured resources for prominent display in media section'
  })
  @ApiResponse({ status: 200, description: 'Featured media resources' })
  async getFeaturedMedia(@Query('limit') limit?: number) {
    return this.resourcesService.getFeaturedResources(limit ? parseInt(limit.toString()) : 10);
  }

  @Get('recent')
  @ApiOperation({ 
    summary: 'Get recently added media',
    description: 'Retrieve recently added resources for "What\'s New" section'
  })
  @ApiResponse({ status: 200, description: 'Recently added resources' })
  async getRecentMedia(@Query('limit') limit?: number, @Query('days') days?: number) {
    const daysBack = days ? parseInt(days.toString()) : 30;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    return this.resourcesService.findPublicResources({
      limit: limit ? parseInt(limit.toString()) : 10,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });
  }

  @Get(':id/content')
  @ApiOperation({ 
    summary: 'Get resource content',
    description: 'Get the actual content of a resource (embedded text, external URL, or download URL)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Resource content',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['embedded', 'external', 'file'] },
        content: { type: 'string', description: 'Text content for embedded resources' },
        url: { type: 'string', description: 'URL for external or file resources' },
        fileName: { type: 'string', description: 'Original filename for downloads' },
        mimeType: { type: 'string', description: 'File MIME type' },
        fileSize: { type: 'number', description: 'File size in bytes' }
      }
    }
  })
  async getResourceContent(@Param('id') id: string, @Request() req: any) {
    return this.resourcesService.getResourceContent(id, req.user.role);
  }

  @Post(':id/track-access')
  @ApiOperation({ 
    summary: 'Track resource access',
    description: 'Track when an agent accesses a resource (for compliance tracking)'
  })
  @ApiResponse({ status: 200, description: 'Access tracked successfully' })
  async trackResourceAccess(@Param('id') id: string, @Request() req: any) {
    return this.resourcesService.trackResourceAccess(id, req.user.id);
  }

  @Get('categories/summary')
  @ApiOperation({ 
    summary: 'Get media categories summary',
    description: 'Get count of resources in each category for navigation'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Categories with resource counts',
    schema: {
      type: 'object',
      additionalProperties: { type: 'number' },
      example: {
        training: 15,
        bank_forms: 3,
        terms_conditions: 5,
        compliance: 8,
        marketing: 12,
        announcements: 4
      }
    }
  })
  async getCategorySummary() {
    const stats = await this.resourcesService.getResourceStats();
    return stats.byCategory;
  }
}
