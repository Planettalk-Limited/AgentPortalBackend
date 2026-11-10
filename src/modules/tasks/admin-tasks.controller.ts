import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { AdminRoleGuard } from '../auth/guards/admin-role.guard';

@ApiTags('Admin - Tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AdminRoleGuard)
@Controller('admin/tasks')
export class AdminTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('cleanup-pending-registrations')
  @ApiOperation({ summary: 'Manually cleanup expired pending registrations (3+ days old)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  @ApiResponse({ status: 500, description: 'Cleanup failed' })
  async cleanupExpiredPendingRegistrations() {
    return this.tasksService.cleanupExpiredPendingRegistrations();
  }
}
