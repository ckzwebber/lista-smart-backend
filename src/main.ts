import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.enableCors({
    origin: [
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:3001',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
