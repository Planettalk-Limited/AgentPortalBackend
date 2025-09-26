import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST') || 'localhost',
  port: configService.get<number>('DB_PORT') || 5432,
  username: configService.get<string>('DB_USERNAME') || 'postgres',
  password: configService.get<string>('DB_PASSWORD') || 'password',
  database: configService.get<string>('DB_NAME') || 'agent_portal',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // Always use migrations for schema changes
  logging: configService.get<string>('NODE_ENV') === 'development',
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: false, // Changed to false to avoid auto-running migrations on app start
});
