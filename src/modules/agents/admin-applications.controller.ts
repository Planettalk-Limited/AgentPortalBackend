import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AgentsService } from './agents.service';
import { ReviewApplicationDto } from './dto/review-application.dto';

@ApiTags('Admin - Agent Applications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/agents/applications')
export class AdminApplicationsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all agent applications (Admin)' })
  @ApiResponse({ status: 200, description: 'List of applications' })
  getApplications(@Query('status') status?: string) {
    return this.agentsService.getApplications(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Application found' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  getApplication(@Param('id') id: string) {
    return this.agentsService.getApplicationById(id);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Review agent application (Admin)' })
  @ApiResponse({ status: 200, description: 'Application reviewed successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  reviewApplication(
    @Param('id') id: string,
    @Body() reviewData: ReviewApplicationDto
  ) {
    return this.agentsService.reviewApplication(id, reviewData);
  }
}
