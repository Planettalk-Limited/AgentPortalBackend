import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TwoFactorService } from './two-factor.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { AgentEarnings } from '../agents/entities/agent-earnings.entity';
import { ReferralUsage } from '../agents/entities/referral-usage.entity';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    PassportModule,
    TypeOrmModule.forFeature([User, AgentEarnings, ReferralUsage]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, TwoFactorService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, TwoFactorService],
})
export class AuthModule {}
