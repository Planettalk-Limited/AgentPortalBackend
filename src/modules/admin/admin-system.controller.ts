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

import { AdminSystemService } from './admin-system.service';

@ApiTags('Admin - System Management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/system')
export class AdminSystemController {
  constructor(private readonly adminSystemService: AdminSystemService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard overview (Admin)' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  getDashboard() {
    return this.adminSystemService.getDashboardData();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health status (Admin)' })
  @ApiResponse({ status: 200, description: 'System health status' })
  getSystemHealth() {
    return this.adminSystemService.getSystemHealth();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get comprehensive system statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'System statistics' })
  getSystemStats(@Query('period') period?: string) {
    return this.adminSystemService.getSystemStats(period);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get system audit logs (Admin)' })
  @ApiResponse({ status: 200, description: 'Audit logs' })
  getAuditLogs(
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.adminSystemService.getAuditLogs({ action, userId, startDate, endDate, page, limit });
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get system settings (Admin)' })
  @ApiResponse({ status: 200, description: 'System settings' })
  getSystemSettings() {
    return this.adminSystemService.getSystemSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update system settings (Admin)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  updateSystemSettings(@Body() settings: Record<string, any>) {
    return this.adminSystemService.updateSystemSettings(settings);
  }

  @Post('maintenance-mode')
  @ApiOperation({ summary: 'Enable maintenance mode (Admin)' })
  @ApiResponse({ status: 200, description: 'Maintenance mode enabled' })
  enableMaintenanceMode(@Body() data: { reason?: string; estimatedDuration?: string }) {
    return this.adminSystemService.enableMaintenanceMode(data.reason, data.estimatedDuration);
  }

  @Delete('maintenance-mode')
  @ApiOperation({ summary: 'Disable maintenance mode (Admin)' })
  @ApiResponse({ status: 200, description: 'Maintenance mode disabled' })
  disableMaintenanceMode() {
    return this.adminSystemService.disableMaintenanceMode();
  }

  @Post('backup')
  @ApiOperation({ summary: 'Create system backup (Admin)' })
  @ApiResponse({ status: 200, description: 'Backup initiated' })
  createBackup(@Body() data?: { includeFiles?: boolean; description?: string }) {
    return this.adminSystemService.createBackup(data?.includeFiles, data?.description);
  }

  @Get('backups')
  @ApiOperation({ summary: 'List system backups (Admin)' })
  @ApiResponse({ status: 200, description: 'List of backups' })
  listBackups() {
    return this.adminSystemService.listBackups();
  }

  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear system cache (Admin)' })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  clearCache(@Body() data?: { cacheType?: string }) {
    return this.adminSystemService.clearCache(data?.cacheType);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get system performance metrics (Admin)' })
  @ApiResponse({ status: 200, description: 'Performance metrics' })
  getPerformanceMetrics(@Query('period') period?: string) {
    return this.adminSystemService.getPerformanceMetrics(period);
  }

  @Get('errors')
  @ApiOperation({ summary: 'Get system error logs (Admin)' })
  @ApiResponse({ status: 200, description: 'Error logs' })
  getErrorLogs(
    @Query('level') level?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.adminSystemService.getErrorLogs({ level, startDate, endDate, page, limit });
  }

  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Send broadcast notification (Admin)' })
  @ApiResponse({ status: 200, description: 'Notification sent' })
  sendBroadcastNotification(@Body() data: { 
    title: string; 
    message: string; 
    type: string; 
    targetUsers?: string[];
    targetRoles?: string[];
  }) {
    return this.adminSystemService.sendBroadcastNotification(data);
  }

  @Get('database/info')
  @ApiOperation({ summary: 'Get database information (Admin)' })
  @ApiResponse({ status: 200, description: 'Database information' })
  getDatabaseInfo() {
    return this.adminSystemService.getDatabaseInfo();
  }

  @Post('database/optimize')
  @ApiOperation({ summary: 'Optimize database (Admin)' })
  @ApiResponse({ status: 200, description: 'Database optimization initiated' })
  optimizeDatabase() {
    return this.adminSystemService.optimizeDatabase();
  }
}
