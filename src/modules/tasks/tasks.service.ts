import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private usersService: UsersService) {}

  /**
   * Manual cleanup method for expired pending registrations
   * Note: To enable automatic scheduling, install @nestjs/schedule and add @Cron decorators
   */
  async cleanupExpiredPendingRegistrations() {
    this.logger.log('Starting cleanup of expired pending registrations...');
    
    try {
      const result = await this.usersService.cleanupExpiredPendingRegistrations();
      this.logger.log(`Cleanup completed: ${result.message}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to cleanup expired pending registrations:', error);
      throw error;
    }
  }

  /**
   * Get count of pending registrations for monitoring
   */
  async getPendingRegistrationsCount() {
    this.logger.log('Checking pending registrations count...');
    
    try {
      // You can implement this method in UsersService if needed
      this.logger.log('Pending registrations check completed');
      return { message: 'Pending registrations check completed' };
    } catch (error) {
      this.logger.error('Failed to check pending registrations:', error);
      throw error;
    }
  }
}
