import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LlmGateway } from './llm/llm-gateway.interface';
import { LLM_GATEWAY } from './llm/llm.constants';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const llmGateway: LlmGateway = {
      generateAnswer: () => ({ content: 'Fake LLM response: test' }),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: LLM_GATEWAY,
          useValue: llmGateway,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('ask', () => {
    it('should return a generated answer', async () => {
      await expect(appController.ask({ prompt: 'test' })).resolves.toEqual({
        content: 'Fake LLM response: test',
      });
    });
  });
});
