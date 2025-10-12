import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { AgentsService } from './agents.service';
import { CreateReferralCodeDto } from './dto/create-referral-code.dto';
import { UseReferralCodeDto } from './dto/use-referral-code.dto';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';
import { CreateEarningAdjustmentDto } from './dto/create-earning-adjustment.dto';

@ApiTags('Agent Management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  // Core Agent Endpoints

  @Get('me')
  @ApiOperation({ summary: 'Get current user\'s agent data' })
  @ApiResponse({ status: 200, description: 'Agent data found or created' })
  getCurrentUserAgent(@Request() req: any) {
    return this.agentsService.findByUserId(req.user.id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate agent after first login' })
  @ApiResponse({ status: 200, description: 'Agent activated successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  activateAgent(@Param('id') id: string) {
    return this.agentsService.activateAgent(id);
  }


  // Referral System
  @Post(':agentId/referral-codes')
  @ApiOperation({ summary: 'Create referral code for agent' })
  @ApiResponse({ status: 201, description: 'Referral code created successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  createReferralCode(
    @Param('agentId') agentId: string,
    @Body() createReferralCodeDto: CreateReferralCodeDto
  ) {
    return this.agentsService.createReferralCode(agentId, createReferralCodeDto);
  }

  @Get(':agentId/referral-codes')
  @ApiOperation({ summary: 'Get agent referral codes' })
  @ApiResponse({ status: 200, description: 'List of referral codes' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  getAgentReferralCodes(@Param('agentId') agentId: string) {
    return this.agentsService.getAgentReferralCodes(agentId);
  }


  // Earnings Management
  @Get(':agentId/earnings')
  @ApiOperation({ summary: 'Get agent earnings' })
  @ApiResponse({ status: 200, description: 'Agent earnings data' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  getAgentEarnings(@Param('agentId') agentId: string) {
    return this.agentsService.getAgentEarnings(agentId);
  }

  @Get(':agentId/earnings/summary')
  @ApiOperation({ summary: 'Get agent earnings summary' })
  @ApiResponse({ status: 200, description: 'Earnings summary' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  getEarningsSummary(@Param('agentId') agentId: string) {
    return this.agentsService.getEarningsSummary(agentId);
  }

  // Payout System
  @Post(':agentId/payouts')
  @ApiOperation({ summary: 'Request payout for agent' })
  @ApiResponse({ status: 201, description: 'Payout request created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payout request or insufficient balance' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  requestPayout(
    @Param('agentId') agentId: string,
    @Body() createPayoutRequestDto: CreatePayoutRequestDto
  ) {
    return this.agentsService.requestPayout(agentId, createPayoutRequestDto);
  }

  @Get(':agentId/payouts')
  @ApiOperation({ summary: 'Get agent payout history' })
  @ApiResponse({ status: 200, description: 'List of payouts' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  getAgentPayouts(@Param('agentId') agentId: string, @Query('status') status?: string) {
    return this.agentsService.getAgentPayouts(agentId, status);
  }

  @Get('payouts/:id')
  @ApiOperation({ summary: 'Get payout details by ID' })
  @ApiResponse({ status: 200, description: 'Payout details' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  getPayoutById(@Param('id') id: string) {
    return this.agentsService.getPayoutById(id);
  }

  // Removed cancelPayout endpoint as payouts can no longer be cancelled
  // Payouts can only be: PENDING, APPROVED, REJECTED, or REVIEW
}
