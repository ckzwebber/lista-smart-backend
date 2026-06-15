import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'));

  const defaultOrigins = [
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:3001',
    'http://localhost:3000',
  ];
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : defaultOrigins;

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  });

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
}
bootstrap();
