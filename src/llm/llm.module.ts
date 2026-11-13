import { Module } from '@nestjs/common';

import { AnthropicLlmFactory } from './anthropic/anthropic.factory';
import { LlmGateway } from './llm-gateway.interface';
import { getLlmFactory, getLlmProvider } from './llm.config';
import { LLM_GATEWAY } from './llm.constants';

@Module({
  providers: [
    AnthropicLlmFactory,
    {
      provide: LLM_GATEWAY,
      inject: [AnthropicLlmFactory],
      useFactory: (anthropicFactory: AnthropicLlmFactory): LlmGateway => {
        const provider = getLlmProvider();
        const factory = getLlmFactory(provider, [anthropicFactory]);

        factory.validate();
        return factory.create();
      },
    },
  ],
  exports: [LLM_GATEWAY],
})
export class LlmModule {}
