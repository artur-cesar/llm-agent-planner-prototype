import { Module } from '@nestjs/common';

import { AnthropicGateway } from './anthorpic/anthropic.gateway';
import { FakeLlmGateway } from './fake/fake-llm.gateway';
import { LlmGateway } from './llm-gateway.interface';
import {
  LLM_GATEWAY,
  LLM_PROVIDER_ANTHROPIC,
  LLM_PROVIDER_FAKE,
  LlmProvider,
} from './llm.constants';

function getConfiguredProvider(): LlmProvider {
  const provider = process.env.LLM_PROVIDER ?? LLM_PROVIDER_FAKE;

  if (provider === LLM_PROVIDER_FAKE || provider === LLM_PROVIDER_ANTHROPIC) {
    return provider;
  }

  throw new Error(
    `Unsupported LLM_PROVIDER "${provider}". Expected "fake" or "anthropic".`,
  );
}

function assertAnthropicConfiguration(): void {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error(
      'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic.',
    );
  }

  if (!process.env.ANTHROPIC_MODEL?.trim()) {
    throw new Error('ANTHROPIC_MODEL is required when LLM_PROVIDER=anthropic.');
  }
}

@Module({
  providers: [
    AnthropicGateway,
    FakeLlmGateway,
    {
      provide: LLM_GATEWAY,
      inject: [FakeLlmGateway, AnthropicGateway],
      useFactory: (
        fakeGateway: FakeLlmGateway,
        anthropicGateway: AnthropicGateway,
      ): LlmGateway => {
        const provider = getConfiguredProvider();

        if (provider === LLM_PROVIDER_ANTHROPIC) {
          assertAnthropicConfiguration();
          return anthropicGateway;
        }

        return fakeGateway;
      },
    },
  ],
  exports: [LLM_GATEWAY],
})
export class LlmModule {}
