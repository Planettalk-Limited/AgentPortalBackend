import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanetTalkSeeder } from './planettalk.seeder';
import { User } from '../../modules/users/entities/user.entity';
import { Agent } from '../../modules/agents/entities/agent.entity';
import { AgentApplication } from '../../modules/agents/entities/agent-application.entity';
import { ReferralCode } from '../../modules/agents/entities/referral-code.entity';
import { ReferralUsage } from '../../modules/agents/entities/referral-usage.entity';
import { AgentEarnings } from '../../modules/agents/entities/agent-earnings.entity';
import { Payout } from '../../modules/agents/entities/payout.entity';

@Module({
  imports: [
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
  providers: [PlanetTalkSeeder],
  exports: [PlanetTalkSeeder],
})
export class PlanetTalkSeederModule {}
