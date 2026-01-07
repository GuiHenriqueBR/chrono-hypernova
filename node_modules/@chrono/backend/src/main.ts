import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Chrono Hypernova API')
    .setDescription('API do Sistema de Gestão para Corretora de Seguros')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação')
    .addTag('clients', 'Gestão de Clientes')
    .addTag('policies', 'Gestão de Apólices')
    .addTag('claims', 'Gestão de Sinistros')
    .addTag('quotes', 'Cotações e Propostas')
    .addTag('endorsements', 'Endossos')
    .addTag('finance', 'Financeiro e Comissões')
    .addTag('whatsapp', 'CRM WhatsApp')
    .addTag('tasks', 'Tarefas e Agenda')
    .addTag('dashboard', 'Dashboard e Relatórios')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
  🚀 Chrono Hypernova Backend is running!
  
  📍 API: http://localhost:${port}/api
  📚 Docs: http://localhost:${port}/api/docs
  `);
}

bootstrap();
