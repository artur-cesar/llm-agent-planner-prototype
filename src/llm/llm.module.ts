import { Module } from '@nestjs/common';

import { AnthropicLlmFactory } from './anthropic/anthropic.factory';
import { FakeLlmFactory } from './fake/fake.factory';
import { LlmGateway } from './llm-gateway.interface';
import { getLlmFactory, getLlmProvider } from './llm.config';
import { LLM_GATEWAY } from './llm.constants';

@Module({
  providers: [
    FakeLlmFactory,
    AnthropicLlmFactory,
    {
      provide: LLM_GATEWAY,
      inject: [FakeLlmFactory, AnthropicLlmFactory],
      useFactory: (
        fakeFactory: FakeLlmFactory,
        anthropicFactory: AnthropicLlmFactory,
      ): LlmGateway => {
        const provider = getLlmProvider();
        const factory = getLlmFactory(provider, [
          fakeFactory,
          anthropicFactory,
        ]);

        factory.validate();
        return factory.create();
      },
    },
  ],
  exports: [LLM_GATEWAY],
})
export class LlmModule {}
