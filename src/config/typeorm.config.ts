import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

// Configuration loaded successfully

export default new DataSource({
  type: 'postgres',
  host: configService.get<string>('DB_HOST') || 'localhost',
  port: configService.get<number>('DB_PORT') || 5432,
  username: configService.get<string>('DB_USERNAME') || 'postgres',
  password: configService.get<string>('DB_PASSWORD') || 'password',
  database: configService.get<string>('DB_NAME') || 'agent_portal',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: configService.get<string>('NODE_ENV') === 'development',
});
