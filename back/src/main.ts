import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Garantir existência da pasta de uploads de fotos/documentos
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Servir pasta uploads publicamente via HTTP
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });

  // Habilitar CORS para permitir requisições do Next.js e de outros clientes
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validação global com Class Validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Configuração da Documentação Interativa com Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Sistema de Gerenciamento de Tarefas - API NestJS')
    .setDescription(
      'API corporativa para gerenciamento de tarefas (Kanban), RBAC, feed interativo, compartilhamento e autenticação JWT/Bcrypt com Prisma ORM e MySQL.',
    )
    .setVersion('2.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`=======================================================`);
  console.log(`🚀 Backend NestJS rodando com sucesso na porta: ${port}`);
  console.log(`📄 Documentação Swagger UI: http://localhost:${port}/api/docs`);
  console.log(`📁 Diretório de Uploads: ${uploadsDir}`);
  console.log(`⚡ API Base URL: http://localhost:${port}/`);
  console.log(`=======================================================`);
}

bootstrap();
