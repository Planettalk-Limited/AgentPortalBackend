import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { LifecycleEmailsService } from './lifecycle-emails.service';

export const LIFECYCLE_CRON_JOB = 'partner-lifecycle-emails';

/**
 * Registers the daily lifecycle run (default 09:00 Europe/London) when
 * LIFECYCLE_EMAILS_ENABLED=true. Registered dynamically rather than with @Cron so the
 * schedule, time zone and on/off switch all come from env vars.
 */
@Injectable()
export class LifecycleSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LifecycleSchedulerService.name);

  constructor(
    private readonly lifecycle: LifecycleEmailsService,
    private readonly registry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    const { enabled, cron, timeZone } = this.lifecycle.config;
    if (!enabled) {
      this.logger.log('Partner lifecycle emails are disabled (set LIFECYCLE_EMAILS_ENABLED=true to schedule them)');
      return;
    }

    const job = new CronJob(cron, () => void this.tick(), null, false, timeZone);
    this.registry.addCronJob(LIFECYCLE_CRON_JOB, job);
    job.start();
    this.logger.log(`Partner lifecycle emails scheduled: "${cron}" (${timeZone})`);
  }

  private async tick(): Promise<void> {
    try {
      await this.lifecycle.run({ dryRun: false, trigger: 'schedule' });
    } catch (error) {
      this.logger.error(`Scheduled lifecycle run failed: ${error?.message}`, error?.stack);
    }
  }
}
