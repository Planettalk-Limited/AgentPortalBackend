import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { AgentsService } from './agents.service';
import { UpdatePayoutStatusDto } from './dto/update-payout-status.dto';

@ApiTags('Admin - Payout Management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/payouts')
export class AdminPayoutController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all payout requests (Admin)' })
  @ApiResponse({ status: 200, description: 'List of all payout requests' })
  getAllPayouts(
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.agentsService.getAllPayouts({ 
      status, 
      method, 
      page: page ? Number(page) : undefined, 
      limit: limit ? Number(limit) : undefined 
    });
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending payout requests (Admin)' })
  @ApiResponse({ status: 200, description: 'List of pending payouts' })
  getPendingPayouts() {
    return this.agentsService.getPendingPayouts();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get payout statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Payout statistics' })
  getPayoutStats(@Query('period') period?: string) {
    return this.agentsService.getPayoutStats(period);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve payout request (Admin)' })
  @ApiResponse({ status: 200, description: 'Payout approved successfully' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  approvePayout(@Param('id') id: string, @Body() notes?: { adminNotes?: string }) {
    return this.agentsService.approvePayout(id, notes?.adminNotes);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject payout request (Admin)' })
  @ApiResponse({ status: 200, description: 'Payout rejected successfully' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  rejectPayout(
    @Param('id') id: string,
    @Body() data: { rejectionReason: string; adminNotes?: string }
  ) {
    return this.agentsService.rejectPayout(id, data.rejectionReason, data.adminNotes);
  }

  @Patch(':id/process')
  @ApiOperation({ summary: 'Mark payout as processing (Admin)' })
  @ApiResponse({ status: 200, description: 'Payout marked as processing' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  processPayout(@Param('id') id: string, @Body() data?: { adminNotes?: string }) {
    return this.agentsService.processPayout(id, data?.adminNotes);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark payout as completed (Admin)' })
  @ApiResponse({ status: 200, description: 'Payout completed successfully' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  completePayout(
    @Param('id') id: string,
    @Body() data: { transactionId: string; fees?: number; adminNotes?: string }
  ) {
    return this.agentsService.completePayout(id, data);
  }

  @Post('bulk-process')
  @ApiOperation({ summary: 'Bulk process multiple payouts (Admin)' })
  @ApiResponse({ status: 200, description: 'Bulk processing initiated' })
  bulkProcessPayouts(@Body() data: { payoutIds: string[]; action: string }) {
    return this.agentsService.bulkProcessPayouts(data.payoutIds, data.action);
  }
}

