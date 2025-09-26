import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { TemplateService } from './template.service';
import { AdminTemplatesController } from './admin-templates.controller';
import { AdminEmailTestController } from './admin-email-test.controller';

@Module({
  controllers: [AdminTemplatesController, AdminEmailTestController],
  providers: [EmailService, TemplateService],
  exports: [EmailService, TemplateService],
})
export class EmailModule {}
