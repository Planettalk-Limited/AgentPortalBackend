import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  PORT: number;

  @IsString()
  API_PREFIX: string;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  // Legacy SMTP settings (optional for backward compatibility)
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  SMTP_PORT?: number;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  // Mailgun settings (preferred)
  @IsOptional()
  @IsString()
  MAILGUN_API_KEY?: string;

  @IsOptional()
  @IsString()
  MAILGUN_DOMAIN?: string;

  @IsOptional()
  @IsString()
  MAILGUN_FROM_EMAIL?: string;

  @IsOptional()
  @IsString()
  MAILGUN_API_URL?: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  BCRYPT_ROUNDS: number;
}
