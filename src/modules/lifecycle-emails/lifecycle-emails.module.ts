import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule } from '../email/email.module';
import { Agent } from '../agents/entities/agent.entity';
import { AgentEarnings } from '../agents/entities/agent-earnings.entity';
import { PartnerLifecycleState } from './entities/partner-lifecycle-state.entity';
import { LifecycleEmail } from './entities/lifecycle-email.entity';
import { LifecycleEmailEvent } from './entities/lifecycle-email-event.entity';
import { PartnerLifecycleEvent } from './entities/partner-lifecycle-event.entity';
import { LifecycleEmailsService } from './lifecycle-emails.service';
import { LifecycleTrackingService } from './lifecycle-tracking.service';
import { LifecycleSchedulerService } from './lifecycle-scheduler.service';
import { LIFECYCLE_STORE, TypeOrmLifecycleStore } from './lifecycle.store';
import { AdminLifecycleEmailsController } from './admin-lifecycle-emails.controller';
import { LifecycleEmailsPublicController } from './lifecycle-emails-public.controller';
import { AdminRoleGuard } from './admin-role.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Agent, AgentEarnings, PartnerLifecycleState, LifecycleEmail, LifecycleEmailEvent, PartnerLifecycleEvent]),
    EmailModule,
  ],
  controllers: [AdminLifecycleEmailsController, LifecycleEmailsPublicController],
  providers: [
    { provide: LIFECYCLE_STORE, useClass: TypeOrmLifecycleStore },
    LifecycleEmailsService,
    LifecycleTrackingService,
    LifecycleSchedulerService,
    AdminRoleGuard,
  ],
  exports: [LifecycleEmailsService],
})
export class LifecycleEmailsModule {}
