import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AdminTasksController } from './admin-tasks.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
  ],
  controllers: [AdminTasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
