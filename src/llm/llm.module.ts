import { Module } from '@nestjs/common';

import { FakeLlmGateway } from './fake-llm.gateway';
import { LLM_GATEWAY } from './llm.constants';

@Module({
  providers: [
    FakeLlmGateway,
    {
      provide: LLM_GATEWAY,
      useExisting: FakeLlmGateway,
    },
  ],
  exports: [LLM_GATEWAY],
})
export class LlmModule {}
