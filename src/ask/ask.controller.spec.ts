import { Test, TestingModule } from '@nestjs/testing';

import type { LlmGateway } from '../llm/llm-gateway.interface';

import { LLM_GATEWAY } from '../llm/llm.constants';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';

describe('AskController', () => {
  let askController: AskController;

  beforeEach(async () => {
    const llmGateway: LlmGateway = {
      generateAnswer: () => ({ content: 'Fake LLM response: test' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AskController],
      providers: [
        AskService,
        {
          provide: LLM_GATEWAY,
          useValue: llmGateway,
        },
      ],
    }).compile();

    askController = module.get<AskController>(AskController);
  });

  it('should return a generated answer', async () => {
    await expect(askController.ask({ prompt: 'test' })).resolves.toEqual({
      content: 'Fake LLM response: test',
    });
  });
});
