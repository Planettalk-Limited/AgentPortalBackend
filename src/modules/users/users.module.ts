import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { User } from './entities/user.entity';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => AgentsModule),
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
