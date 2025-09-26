import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { AdminNotificationsController } from './admin-notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    forwardRef(() => UsersModule),
    EmailModule,
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
