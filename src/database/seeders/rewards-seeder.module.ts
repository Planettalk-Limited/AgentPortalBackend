import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardsSeeder } from './rewards.seeder';
import { Agent } from '../../modules/agents/entities/agent.entity';
import { AgentEarnings } from '../../modules/agents/entities/agent-earnings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, AgentEarnings]),
  ],
  providers: [RewardsSeeder],
  exports: [RewardsSeeder],
})
export class RewardsSeederModule {}
