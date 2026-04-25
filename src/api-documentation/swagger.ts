import type { INestApplication } from '@nestjs/common';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('LLM Order Planner Prototype API')
    .setDescription(
      'Interactive documentation for the ask endpoint with multi-turn conversations, tool calling, and planner-based execution.',
    )
    .setVersion('1.0.0')
    .build();
}

export function buildSwaggerDocument(app: INestApplication) {
  return SwaggerModule.createDocument(app, buildSwaggerConfig());
}

export function configureSwagger(app: INestApplication): void {
  const document = buildSwaggerDocument(app);

  SwaggerModule.setup(SWAGGER_PATH, app, document);
}
