import { Test } from '@nestjs/testing';

import type { LlmGateway } from './llm-gateway.interface';

import { LLM_GATEWAY } from './llm.constants';
import { LlmModule } from './llm.module';

describe('LlmModule', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.LLM_PROVIDER;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use the fake provider by default', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LlmModule],
    }).compile();

    const gateway = moduleRef.get<LlmGateway>(LLM_GATEWAY);

    expect(gateway.generateAnswer({ prompt: 'test' })).toEqual({
      content: 'Fake LLM response: test',
    });
  });

  it('should fail clearly when Anthropic is selected without credentials', async () => {
    process.env.LLM_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

    await expect(
      Test.createTestingModule({
        imports: [LlmModule],
      }).compile(),
    ).rejects.toThrow(
      'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic.',
    );
  });
});
