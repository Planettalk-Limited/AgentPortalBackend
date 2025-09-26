import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { DatabaseSeeder } from './database.seeder';
import { User } from '../../modules/users/entities/user.entity';
import { Agent } from '../../modules/agents/entities/agent.entity';
import { AgentApplication } from '../../modules/agents/entities/agent-application.entity';
import { ReferralCode } from '../../modules/agents/entities/referral-code.entity';
import { ReferralUsage } from '../../modules/agents/entities/referral-usage.entity';
import { AgentEarnings } from '../../modules/agents/entities/agent-earnings.entity';
import { Payout } from '../../modules/agents/entities/payout.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      User,
      Agent,
      AgentApplication,
      ReferralCode,
      ReferralUsage,
      AgentEarnings,
      Payout,
    ]),
  ],
  providers: [DatabaseSeeder],
  exports: [DatabaseSeeder],
})
export class SeederModule {}
