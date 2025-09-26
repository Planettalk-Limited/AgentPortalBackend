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

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Admin - User Management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (Admin)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  getAllUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.usersService.getAllUsersAdmin({ 
      role, 
      status, 
      search, 
      page: page ? Number(page) : undefined, 
      limit: limit ? Number(limit) : undefined 
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  getUserStats() {
    return this.usersService.getUserStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user (Admin)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user data' })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUserAdmin(createUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (Admin)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user role (Admin)' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUserRole(@Param('id') id: string, @Body() data: { role: string; reason?: string }) {
    return this.usersService.updateUserRole(id, data.role, data.reason);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user status (Admin)' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUserStatus(@Param('id') id: string, @Body() data: { status: string; reason?: string }) {
    return this.usersService.updateUserStatus(id, data.status, data.reason);
  }

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Reset user password (Admin)' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  resetUserPassword(@Param('id') id: string, @Body() data?: { temporaryPassword?: string; sendEmail?: boolean }) {
    return this.usersService.resetUserPasswordAdmin(id, data?.temporaryPassword, data?.sendEmail);
  }

  @Patch(':id/force-password-change')
  @ApiOperation({ summary: 'Force user to change password on next login (Admin)' })
  @ApiResponse({ status: 200, description: 'Password change forced' })
  @ApiResponse({ status: 404, description: 'User not found' })
  forcePasswordChange(@Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.usersService.forcePasswordChange(id, data?.reason);
  }

  @Patch(':id/unlock')
  @ApiOperation({ summary: 'Unlock user account (Admin)' })
  @ApiResponse({ status: 200, description: 'User account unlocked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  unlockUser(@Param('id') id: string, @Body() data?: { reason?: string }) {
    return this.usersService.unlockUser(id, data?.reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (Admin)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete user with active data' })
  deleteUser(@Param('id') id: string, @Body() data?: { reason?: string; forceDelete?: boolean }) {
    return this.usersService.deleteUser(id, data?.reason, data?.forceDelete);
  }

  @Post('bulk-actions')
  @ApiOperation({ summary: 'Bulk user operations (Admin)' })
  @ApiResponse({ status: 200, description: 'Bulk operation completed' })
  bulkUserActions(@Body() data: { userIds: string[]; action: string; parameters?: any }) {
    return this.usersService.bulkUserActions(data.userIds, data.action, data.parameters);
  }

  @Get(':id/activity-log')
  @ApiOperation({ summary: 'Get user activity log (Admin)' })
  @ApiResponse({ status: 200, description: 'User activity log' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserActivityLog(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.usersService.getUserActivityLog(id, limit);
  }

  @Get(':id/login-history')
  @ApiOperation({ summary: 'Get user login history (Admin)' })
  @ApiResponse({ status: 200, description: 'User login history' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserLoginHistory(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.usersService.getUserLoginHistory(id, limit);
  }
}
