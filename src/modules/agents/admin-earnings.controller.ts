import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AgentsService } from './agents.service';
import { CreateEarningAdjustmentDto } from './dto/create-earning-adjustment.dto';

@ApiTags('Admin - Earnings Management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/earnings')
export class AdminEarningsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('agents/:agentId/adjust')
  @ApiOperation({ summary: 'Create earning adjustment (Admin only)' })
  @ApiResponse({ status: 201, description: 'Earning adjustment created successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment amount' })
  createEarningAdjustment(
    @Param('agentId') agentId: string,
    @Body() createAdjustmentDto: CreateEarningAdjustmentDto
  ) {
    return this.agentsService.createEarningAdjustment(agentId, createAdjustmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all earnings with filtering (Admin)' })
  @ApiResponse({ status: 200, description: 'List of earnings with pagination and metrics' })
  getAllEarnings(
    @Query('status') status?: string,
    @Query('agentId') agentId?: string,
    @Query('tier') tier?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agentsService.getAllEarnings({
      status,
      agentId,
      tier,
      startDate,
      endDate,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get system-wide earnings summary (Admin)' })
  @ApiResponse({ status: 200, description: 'System earnings summary' })
  getSystemEarningsSummary(@Query('period') period?: string) {
    return this.agentsService.getSystemEarningsSummary(period);
  }

  @Get('agents/:id/financial-overview')
  @ApiOperation({ summary: 'Get detailed financial overview for agent (Admin)' })
  @ApiResponse({ status: 200, description: 'Agent financial overview' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  getAgentFinancialOverview(@Param('id') id: string) {
    return this.agentsService.getAgentFinancialOverview(id);
  }

  @Get('agents/:id/audit')
  @ApiOperation({ summary: 'Get earnings audit trail for agent (Admin)' })
  @ApiResponse({ status: 200, description: 'Earnings audit trail' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  getEarningsAuditTrail(@Param('id') id: string) {
    // This would need to be implemented in the service
    return { message: 'Earnings audit trail - to be implemented' };
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending earnings for approval (Admin)' })
  @ApiResponse({ status: 200, description: 'List of pending earnings' })
  getPendingEarnings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('agentId') agentId?: string
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    return this.agentsService.getPendingEarnings(pageNum, limitNum, agentId);
  }

  @Post(':earningId/approve')
  @ApiOperation({ summary: 'Approve individual pending earning (Admin)' })
  @ApiResponse({ status: 200, description: 'Earning approved successfully' })
  @ApiResponse({ status: 404, description: 'Earning not found' })
  @ApiResponse({ status: 400, description: 'Earning not in pending status' })
  approveEarning(
    @Param('earningId') earningId: string,
    @Body() approvalData?: { notes?: string }
  ) {
    return this.agentsService.approveEarning(earningId, approvalData?.notes);
  }

  @Post(':earningId/reject')
  @ApiOperation({ summary: 'Reject individual pending earning (Admin)' })
  @ApiResponse({ status: 200, description: 'Earning rejected successfully' })
  @ApiResponse({ status: 404, description: 'Earning not found' })
  @ApiResponse({ status: 400, description: 'Earning not in pending status' })
  rejectEarning(
    @Param('earningId') earningId: string,
    @Body() rejectionData: { reason: string; notes?: string }
  ) {
    return this.agentsService.rejectEarning(earningId, rejectionData.reason, rejectionData.notes);
  }

  @Post('bulk-approve')
  @ApiOperation({ summary: 'Bulk approve multiple pending earnings (Admin)' })
  @ApiResponse({ status: 200, description: 'Bulk approval completed' })
  @ApiResponse({ status: 400, description: 'Invalid earning IDs provided' })
  bulkApproveEarnings(
    @Body() bulkData: { earningIds: string[]; notes?: string }
  ) {
    return this.agentsService.bulkApproveEarnings(bulkData.earningIds, bulkData.notes);
  }

  @Post('bulk-reject')
  @ApiOperation({ summary: 'Bulk reject multiple pending earnings (Admin)' })
  @ApiResponse({ status: 200, description: 'Bulk rejection completed' })
  @ApiResponse({ status: 400, description: 'Invalid earning IDs provided' })
  bulkRejectEarnings(
    @Body() bulkData: { earningIds: string[]; reason: string; notes?: string }
  ) {
    return this.agentsService.bulkRejectEarnings(bulkData.earningIds, bulkData.reason, bulkData.notes);
  }
}
