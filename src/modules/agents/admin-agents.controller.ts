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
import { UpdateAgentEarningsDto, UpdateAgentReferralsDto, BulkUpdateEarningsDto, BulkUpdateReferralsDto, UpdateAgentStatsDto, BulkUpdateAgentStatsDto, UpdateAgentStatsByCodeDto, BulkUpdateAgentStatsByCodeDto } from './dto/update-agent-stats.dto';

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

  // External Stats Update Endpoints
  @Post('update-earnings')
  @ApiOperation({ summary: 'Update agent earnings externally (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent earnings updated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 400, description: 'Invalid earnings data' })
  updateAgentEarnings(@Body() updateDto: UpdateAgentEarningsDto) {
    return this.agentsService.updateAgentEarnings(updateDto);
  }

  @Post('update-referrals')
  @ApiOperation({ summary: 'Update agent referrals externally (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent referrals updated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 400, description: 'Invalid referrals data' })
  updateAgentReferrals(@Body() updateDto: UpdateAgentReferralsDto) {
    return this.agentsService.updateAgentReferrals(updateDto);
  }

  @Post('bulk-update-earnings')
  @ApiOperation({ summary: 'Bulk update multiple agents earnings (Admin)' })
  @ApiResponse({ status: 200, description: 'Bulk earnings update completed' })
  @ApiResponse({ status: 400, description: 'Invalid bulk earnings data' })
  bulkUpdateEarnings(@Body() bulkDto: BulkUpdateEarningsDto) {
    return this.agentsService.bulkUpdateEarnings(bulkDto);
  }

  @Post('bulk-update-referrals')
  @ApiOperation({ summary: 'Bulk update multiple agents referrals (Admin)' })
  @ApiResponse({ status: 200, description: 'Bulk referrals update completed' })
  @ApiResponse({ status: 400, description: 'Invalid bulk referrals data' })
  bulkUpdateReferrals(@Body() bulkDto: BulkUpdateReferralsDto) {
    return this.agentsService.bulkUpdateReferrals(bulkDto);
  }

  // Combined Stats Update Endpoints
  @Post('update-stats')
  @ApiOperation({ summary: 'Update agent earnings and/or referrals in single request (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent stats updated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 400, description: 'Invalid stats data' })
  updateAgentStats(@Body() updateDto: UpdateAgentStatsDto) {
    return this.agentsService.updateAgentStats(updateDto);
  }

  @Post('bulk-update-stats')
  @ApiOperation({ summary: 'Bulk update multiple agents stats (earnings and/or referrals) (Admin)' })
  @ApiResponse({ status: 200, description: 'Bulk stats update completed' })
  @ApiResponse({ status: 400, description: 'Invalid bulk stats data' })
  bulkUpdateAgentStats(@Body() bulkDto: BulkUpdateAgentStatsDto) {
    return this.agentsService.bulkUpdateAgentStats(bulkDto);
  }

  // Agent Code-based Endpoints
  @Post('update-stats-by-code')
  @ApiOperation({ summary: 'Update agent earnings and/or referrals by agent code (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent stats updated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 400, description: 'Invalid stats data' })
  updateAgentStatsByCode(@Body() updateDto: UpdateAgentStatsByCodeDto) {
    return this.agentsService.updateAgentStatsByCode(updateDto);
  }

  @Post('bulk-update-stats-by-code')
  @ApiOperation({ summary: 'Bulk update multiple agents stats by agent codes (Admin)' })
  @ApiResponse({ status: 200, description: 'Bulk stats update completed' })
  @ApiResponse({ status: 400, description: 'Invalid bulk stats data' })
  bulkUpdateAgentStatsByCode(@Body() bulkDto: BulkUpdateAgentStatsByCodeDto) {
    return this.agentsService.bulkUpdateAgentStatsByCode(bulkDto);
  }

  // Balance Recalculation Endpoints
  @Post(':id/recalculate-balances')
  @ApiOperation({ 
    summary: 'Recalculate agent balances from database records (Admin)',
    description: 'Fixes any discrepancies in agent balances by recalculating from actual earnings and payouts in the database'
  })
  @ApiResponse({ status: 200, description: 'Balances recalculated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  recalculateAgentBalances(@Param('id') id: string) {
    return this.agentsService.recalculateAgentBalances(id);
  }

  @Post('recalculate-all-balances')
  @ApiOperation({ 
    summary: 'Recalculate balances for all agents (Admin)',
    description: 'Recalculates balances for all agents in the system. Use this to fix balance discrepancies across the platform.'
  })
  @ApiResponse({ status: 200, description: 'All balances recalculated successfully' })
  recalculateAllAgentBalances() {
    return this.agentsService.recalculateAllAgentBalances();
  }

}
