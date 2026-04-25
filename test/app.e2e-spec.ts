import type { Express } from 'express';

import { INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  buildSwaggerDocument,
  configureSwagger,
  SWAGGER_PATH,
} from '../src/api-documentation/swagger';
import { AskController } from '../src/ask/ask.controller';
import { AskService } from '../src/ask/ask.service';

@Module({
  controllers: [AskController],
  providers: [
    {
      provide: AskService,
      useValue: {
        ask: jest.fn(),
      },
    },
  ],
})
class SwaggerTestModule {}

type SwaggerDocument = {
  components: {
    schemas: Record<string, unknown>;
  };
  info: {
    description: string;
    title: string;
    version: string;
  };
  paths: Record<
    string,
    {
      post?: {
        parameters?: Array<{
          in: string;
          name: string;
        }>;
      };
    }
  >;
};

describe('API documentation (e2e)', () => {
  let app: INestApplication;
  let httpApp: Express;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SwaggerTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureSwagger(app);
    await app.init();
    httpApp = app.getHttpAdapter().getInstance() as Express;
  });

  it('should register the Swagger UI routes', () => {
    const registeredPaths = (httpApp.router?.stack ?? []).map((layer) =>
      String(layer.route?.path ?? layer.regexp ?? ''),
    );

    expect(registeredPaths).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`/${SWAGGER_PATH}`),
        expect.stringContaining(`/${SWAGGER_PATH}-json`),
      ]),
    );
  });

  it('should expose the OpenAPI document with the ask endpoint schema', () => {
    const document = buildSwaggerDocument(app) as SwaggerDocument;

    expect(document.info).toEqual(
      expect.objectContaining({
        description:
          'Interactive documentation for the ask endpoint with multi-turn conversations, tool calling, and planner-based execution.',
        title: 'LLM Order Planner Prototype API',
        version: '1.0.0',
      }),
    );
    expect(document.paths['/ask']).toBeDefined();
    expect(document.paths['/ask'].post?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          in: 'header',
          name: 'x-user-id',
        }),
      ]),
    );
    expect(document.components.schemas.AskRequestDto).toBeDefined();
    expect(document.components.schemas.AskResponseDto).toBeDefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
