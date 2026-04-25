import { Injectable } from '@nestjs/common';

import type { LlmProviderFactory } from '../llm-provider-factory.interface';

import { LLM_PROVIDER_ANTHROPIC } from '../llm.constants';
import { AnthropicGateway } from './anthropic.gateway';

@Injectable()
export class AnthropicLlmFactory implements LlmProviderFactory {
  readonly provider = LLM_PROVIDER_ANTHROPIC;

  create(env: NodeJS.ProcessEnv = process.env): AnthropicGateway {
    return new AnthropicGateway({
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL,
    });
  }

  validate(env: NodeJS.ProcessEnv = process.env): void {
    const apiKey = env.ANTHROPIC_API_KEY;
    const model = env.ANTHROPIC_MODEL;

    if (!apiKey?.trim()) {
      throw new Error(
        'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic.',
      );
    }

    if (!model?.trim()) {
      throw new Error(
        'ANTHROPIC_MODEL is required when LLM_PROVIDER=anthropic.',
      );
    }
  }
}
