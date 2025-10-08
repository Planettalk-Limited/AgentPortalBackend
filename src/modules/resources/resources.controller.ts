import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { ResourcesService } from './resources.service';
import { ResourceQueryDto } from './dto/update-resource.dto';
import { Resource } from './entities/resource.entity';

@ApiTags('Agent Resources')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get public resources for agents',
    description: 'Retrieve all public, active, and non-expired resources available to agents'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of public resources with pagination',
    schema: {
      type: 'object',
      properties: {
        resources: { type: 'array', items: { $ref: '#/components/schemas/Resource' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findPublicResources(@Query() query: ResourceQueryDto) {
    return this.resourcesService.findPublicResources(query);
  }

  @Get('featured')
  @ApiOperation({ 
    summary: 'Get featured resources',
    description: 'Retrieve featured resources for display on dashboard or homepage'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of featured resources',
    type: [Resource],
  })
  async getFeaturedResources(@Query('limit') limit?: number) {
    return this.resourcesService.getFeaturedResources(limit ? parseInt(limit.toString()) : 5);
  }

  @Get('categories')
  @ApiOperation({ 
    summary: 'Get available resource categories',
    description: 'Retrieve list of resource categories with counts'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Resource categories with counts',
    schema: {
      type: 'object',
      additionalProperties: { type: 'number' },
      example: {
        training: 15,
        marketing: 8,
        compliance: 5,
        policy: 3,
      },
    },
  })
  async getCategories() {
    const stats = await this.resourcesService.getResourceStats();
    return stats.byCategory;
  }

  @Get('types')
  @ApiOperation({ 
    summary: 'Get available resource types',
    description: 'Retrieve list of resource types with counts'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Resource types with counts',
    schema: {
      type: 'object',
      additionalProperties: { type: 'number' },
      example: {
        document: 20,
        image: 10,
        video: 5,
        audio: 2,
      },
    },
  })
  async getTypes() {
    const stats = await this.resourcesService.getResourceStats();
    return stats.byType;
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get resource details',
    description: 'Retrieve detailed information about a specific resource'
  })
  @ApiResponse({ status: 200, description: 'Resource details', type: Resource })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 403, description: 'Access denied to private resource' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<Resource> {
    return this.resourcesService.findOne(id, req.user.role);
  }

  @Get(':id/view')
  @ApiOperation({ 
    summary: 'Get resource view URL',
    description: 'Generate a secure URL for viewing/streaming the resource (increments view count)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Presigned view URL generated',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Presigned view URL' },
        expiresIn: { type: 'number', description: 'URL expiration time in seconds' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getViewUrl(@Param('id') id: string, @Request() req: any) {
    return this.resourcesService.getPresignedUrl(id, req.user.role);
  }

  @Get(':id/download')
  @ApiOperation({ 
    summary: 'Download resource',
    description: 'Generate a secure download URL for the resource (increments download count)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Download URL generated',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Presigned download URL' },
        fileName: { type: 'string', description: 'Original filename for download' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async downloadResource(@Param('id') id: string, @Request() req: any) {
    return this.resourcesService.downloadResource(id, req.user.role);
  }

  @Get('search/:term')
  @ApiOperation({ 
    summary: 'Search resources',
    description: 'Search public resources by title and description'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results with pagination',
  })
  async searchResources(
    @Param('term') searchTerm: string,
    @Query() query: ResourceQueryDto
  ) {
    const searchQuery = {
      ...query,
      search: searchTerm,
    };
    
    return this.resourcesService.findPublicResources(searchQuery);
  }

  @Get('category/:category')
  @ApiOperation({ 
    summary: 'Get resources by category',
    description: 'Retrieve all public resources in a specific category'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Resources in the specified category',
  })
  async getResourcesByCategory(
    @Param('category') category: string,
    @Query() query: ResourceQueryDto
  ) {
    const categoryQuery = {
      ...query,
      category,
    };
    
    return this.resourcesService.findPublicResources(categoryQuery);
  }

  @Get('type/:type')
  @ApiOperation({ 
    summary: 'Get resources by type',
    description: 'Retrieve all public resources of a specific type'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Resources of the specified type',
  })
  async getResourcesByType(
    @Param('type') type: string,
    @Query() query: ResourceQueryDto
  ) {
    const typeQuery = {
      ...query,
      type,
    };
    
    return this.resourcesService.findPublicResources(typeQuery);
  }
}
