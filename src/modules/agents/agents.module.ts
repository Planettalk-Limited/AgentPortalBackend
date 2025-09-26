import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { PublicAgentsController } from './public-agents.controller';
import { PublicReferralController } from './public-referral.controller';
import { AdminApplicationsController } from './admin-applications.controller';
import { AdminAgentsController } from './admin-agents.controller';
import { AdminPayoutsController } from './admin-payouts.controller';
import { AdminEarningsController } from './admin-earnings.controller';
import { Agent } from './entities/agent.entity';
import { AgentApplication } from './entities/agent-application.entity';
import { ReferralCode } from './entities/referral-code.entity';
import { ReferralUsage } from './entities/referral-usage.entity';
import { AgentEarnings } from './entities/agent-earnings.entity';
import { Payout } from './entities/payout.entity';
import { User } from '../users/entities/user.entity';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      AgentApplication,
      ReferralCode,
      ReferralUsage,
      AgentEarnings,
      Payout,
      User,
    ]),
    EmailModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [
    AgentsController,
    PublicAgentsController,
    PublicReferralController,
    AdminApplicationsController,
    AdminAgentsController,
    AdminPayoutsController,
    AdminEarningsController,
  ],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
