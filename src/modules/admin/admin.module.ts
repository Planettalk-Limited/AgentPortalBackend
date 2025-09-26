import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminSystemController } from './admin-system.controller';
import { AdminSystemService } from './admin-system.service';
import { FixUserDataController } from './fix-user-data.controller';
import { User } from '../users/entities/user.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Payout } from '../agents/entities/payout.entity';
import { AgentEarnings } from '../agents/entities/agent-earnings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Agent,
      Payout,
      AgentEarnings,
    ])
  ],
  controllers: [AdminSystemController, FixUserDataController],
  providers: [AdminSystemService],
  exports: [AdminSystemService],
})
export class AdminModule {}
