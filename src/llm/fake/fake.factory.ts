import { Injectable } from '@nestjs/common';

import type { LlmProviderFactory } from '../llm-provider-factory.interface';

import { LLM_PROVIDER_FAKE } from '../llm.constants';
import { FakeLlmGateway } from './fake-llm.gateway';

@Injectable()
export class FakeLlmFactory implements LlmProviderFactory {
  readonly provider = LLM_PROVIDER_FAKE;

  create(): FakeLlmGateway {
    return new FakeLlmGateway();
  }

  validate(): void {}
}
