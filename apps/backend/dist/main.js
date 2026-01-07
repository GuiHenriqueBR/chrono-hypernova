"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const config = new swagger_1.DocumentBuilder()
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
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`
  🚀 Chrono Hypernova Backend is running!
  
  📍 API: http://localhost:${port}/api
  📚 Docs: http://localhost:${port}/api/docs
  `);
}
bootstrap();
//# sourceMappingURL=main.js.map