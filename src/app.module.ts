import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { EnvironmentVariables } from './config/env.validation';
import { getDatabaseConfig } from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AgentsModule } from './modules/agents/agents.module';
import { EmailModule } from './modules/email/email.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TrainingModule } from './modules/training/training.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { RewardsSeederModule } from './database/seeders/rewards-seeder.module';
import { PlanetTalkSeederModule } from './database/seeders/planettalk-seeder.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      // Temporarily disable validation to test
      // validate: async (config: Record<string, unknown>) => {
      //   const validatedConfig = plainToInstance(
      //     EnvironmentVariables,
      //     config,
      //     { enableImplicitConversion: true },
      //   );
      //   const errors = await validate(validatedConfig, { skipMissingProperties: false });
      //   if (errors.length > 0) {
      //     throw new Error(errors.toString());
      //   }
      //   return validatedConfig;
      // },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
    }),
    AuthModule,
    UsersModule,
    AgentsModule,
    EmailModule,
    AdminModule,
    NotificationsModule,
    TrainingModule,
    TasksModule,
    ResourcesModule,
    RewardsSeederModule,
    PlanetTalkSeederModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
