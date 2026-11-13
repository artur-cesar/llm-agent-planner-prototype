import { Test } from '@nestjs/testing';

import type { LlmGateway } from './llm-gateway.interface';

import { AnthropicGateway } from './anthropic/anthropic.gateway';
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

  it('should use Anthropic by default without making a network request', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.ANTHROPIC_MODEL = 'test-model';
    const moduleRef = await Test.createTestingModule({
      imports: [LlmModule],
    }).compile();
    expect(moduleRef.get<LlmGateway>(LLM_GATEWAY)).toBeInstanceOf(
      AnthropicGateway,
    );
    await moduleRef.close();
  });

  it('should reject the removed fake provider', async () => {
    process.env.LLM_PROVIDER = 'fake';
    await expect(
      Test.createTestingModule({ imports: [LlmModule] }).compile(),
    ).rejects.toThrow('Unsupported LLM_PROVIDER');
  });

  it('should require credentials for the default provider', async () => {
    await expect(
      Test.createTestingModule({ imports: [LlmModule] }).compile(),
    ).rejects.toThrow('ANTHROPIC_API_KEY is required');
  });

  it('should require a model', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    await expect(
      Test.createTestingModule({ imports: [LlmModule] }).compile(),
    ).rejects.toThrow('ANTHROPIC_MODEL is required');
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
