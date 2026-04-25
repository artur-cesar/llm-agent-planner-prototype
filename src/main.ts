import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { configureSwagger } from './api-documentation/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  configureSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
