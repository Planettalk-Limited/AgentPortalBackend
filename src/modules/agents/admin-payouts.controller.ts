import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AgentsService } from './agents.service';

@ApiTags('Admin - Payout Management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/payouts')
export class AdminPayoutsController {
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

  @Get('stats')
  @ApiOperation({ summary: 'Get payout statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Payout statistics' })
  getPayoutStats(@Query('period') period?: string) {
    return this.agentsService.getPayoutStats(period);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export pending payouts to CSV (Admin)' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportPayouts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('format') format?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response
  ) {
    const exportData = await this.agentsService.exportPayouts({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      format: format || 'csv',
      status: status || 'pending', // Default to pending payouts only
      method,
      startDate,
      endDate,
    });

    if (format === 'csv' && res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="pending-payouts-export-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(exportData.csvContent);
    }

    return exportData;
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve payout request (Admin)' })
  @ApiResponse({ status: 200, description: 'Payout approved successfully' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  @ApiResponse({ status: 400, description: 'Invalid payout status transition' })
  approvePayout(@Param('id') id: string, @Body() notes?: { adminNotes?: string }) {
    return this.agentsService.approvePayout(id, notes?.adminNotes);
  }

  // Removed reject endpoint as REJECTED status is no longer supported
  // Payouts can only be: PENDING, APPROVED, or REVIEW

  @Patch(':id/review')
  @ApiOperation({ summary: 'Set payout to review status (Admin)' })
  @ApiResponse({ status: 200, description: 'Payout set to review successfully' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  @ApiResponse({ status: 400, description: 'Invalid payout status transition' })
  reviewPayout(
    @Param('id') id: string,
    @Body() data: { reviewMessage: string; adminNotes?: string }
  ) {
    return this.agentsService.reviewPayout(id, data.reviewMessage, data.adminNotes);
  }

  @Post('bulk-process')
  @ApiOperation({ summary: 'Bulk process multiple payouts (Admin)' })
  @ApiResponse({ status: 200, description: 'Bulk processing initiated' })
  @ApiResponse({ status: 400, description: 'Invalid bulk action or payout IDs' })
  bulkProcessPayouts(@Body() data: { 
    payoutIds: string[]; 
    action: 'approve' | 'review'; 
    adminNotes?: string;
    reviewMessage?: string;
    // New: Individual messages per payout
    individualMessages?: { payoutId: string; reviewMessage: string }[];
  }) {
    return this.agentsService.bulkProcessPayouts(data.payoutIds, data.action, {
      adminNotes: data.adminNotes,
      reviewMessage: data.reviewMessage,
      individualMessages: data.individualMessages,
    });
  }
}
