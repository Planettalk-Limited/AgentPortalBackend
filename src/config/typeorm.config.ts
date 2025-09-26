import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

// Configuration loaded successfully

// Determine if we're running in production (compiled) or development
const isProduction = process.env.NODE_ENV === 'production';
const entitiesPath = isProduction ? ['dist/**/*.entity.js'] : ['src/**/*.entity{.ts,.js}'];
const migrationsPath = isProduction ? ['dist/migrations/*.js'] : ['src/migrations/*{.ts,.js}'];

export default new DataSource({
  type: 'postgres',
  host: configService.get<string>('DB_HOST') || 'localhost',
  port: configService.get<number>('DB_PORT') || 5432,
  username: configService.get<string>('DB_USERNAME') || 'postgres',
  password: configService.get<string>('DB_PASSWORD') || 'password',
  database: configService.get<string>('DB_NAME') || 'agent_portal',
  entities: entitiesPath,
  migrations: migrationsPath,
  synchronize: false,
  logging: configService.get<string>('NODE_ENV') === 'development',
});
