import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  const apiPrefix = configService.get<string>('API_PREFIX');
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Agent Portal API')
    .setDescription('The Agent Portal API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`📧 Email service debugging: http://localhost:${port}/${apiPrefix}/admin/email/service-status`);
  
  // Log email service status on startup
  const emailServiceConfigured = !!(configService.get('MAILGUN_API_KEY') && configService.get('MAILGUN_DOMAIN'));
  if (emailServiceConfigured) {
    logger.log('✅ Mailgun email service detected - emails will be sent via Mailgun');
  } else {
    logger.warn('⚠️ Mailgun not configured - emails will be logged to console only');
    logger.warn('   Required: MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables');
  }
}
bootstrap();
