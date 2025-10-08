import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';

import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';
import { AdminResourcesController } from './admin-resources.controller';
import { AgentMediaController } from './agent-media.controller';
import { S3Service } from './services/s3.service';
import { Resource } from './entities/resource.entity';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resource]),
    forwardRef(() => UsersModule),
    forwardRef(() => NotificationsModule),
    MulterModule.register({
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
      },
    }),
  ],
  controllers: [ResourcesController, AdminResourcesController, AgentMediaController],
  providers: [ResourcesService, S3Service],
  exports: [ResourcesService, S3Service],
})
export class ResourcesModule {}
