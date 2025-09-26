import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@ApiTags('Admin - Agent Management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/agents')
export class AdminAgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all agents (Admin)' })
  @ApiResponse({ status: 200, description: 'List of agents' })
  getAllAgents(
    @Query('status') status?: string,
    @Query('tier') tier?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.agentsService.findAll({
      status,
      tier,
      page,
      limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get agent statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent statistics' })
  getAgentStats() {
    return this.agentsService.getAgentStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent found' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  getAgent(@Param('id') id: string) {
    return this.agentsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new agent (Admin)' })
  @ApiResponse({ status: 201, description: 'Agent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid agent data' })
  createAgent(@Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(createAgentDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update agent (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent updated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  updateAgent(@Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto) {
    return this.agentsService.update(id, updateAgentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete agent (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  deleteAgent(@Param('id') id: string) {
    return this.agentsService.remove(id);
  }

  // Agent Workflow Management
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve agent and generate code (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent approved successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  approveAgent(@Param('id') id: string) {
    return this.agentsService.approveAgent(id);
  }

  @Post(':id/send-credentials')
  @ApiOperation({ summary: 'Send login credentials to agent (Admin)' })
  @ApiResponse({ status: 200, description: 'Credentials sent successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  sendCredentials(@Param('id') id: string) {
    return this.agentsService.sendCredentials(id);
  }

  // Agent Status Management
  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate agent (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 400, description: 'Agent is already inactive' })
  deactivateAgent(@Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.agentsService.deactivateAgent(id, data?.reason);
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate agent (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent reactivated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 400, description: 'Agent is already active' })
  reactivateAgent(@Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.agentsService.reactivateAgent(id, data?.reason);
  }

  @Post('check-inactive')
  @ApiOperation({ summary: 'Check and deactivate inactive agents (6+ months) (Admin)' })
  @ApiResponse({ status: 200, description: 'Inactive agents processed' })
  checkAndDeactivateInactiveAgents() {
    return this.agentsService.checkAndDeactivateInactiveAgents();
  }

  // Financial Management
  @Get(':id/financial-overview')
  @ApiOperation({ summary: 'Get detailed financial overview for agent (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent financial overview' })
  getAgentFinancialOverview(@Param('id') id: string) {
    return this.agentsService.getAgentFinancialOverview(id);
  }

  @Patch(':id/suspend-earnings')
  @ApiOperation({ summary: 'Suspend agent earnings (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent earnings suspended' })
  suspendAgentEarnings(
    @Param('id') id: string,
    @Body() data: { reason: string; adminNotes?: string }
  ) {
    return this.agentsService.suspendAgentEarnings(id, data.reason, data.adminNotes);
  }

  @Patch(':id/resume-earnings')
  @ApiOperation({ summary: 'Resume agent earnings (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent earnings resumed' })
  resumeAgentEarnings(@Param('id') id: string, @Body() data?: { adminNotes?: string }) {
    return this.agentsService.resumeAgentEarnings(id, data?.adminNotes);
  }

}
