import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages';

import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';

import type { AnthropicClient, AnthropicGatewayOptions } from './types';

import {
  GenerateAnswerInput,
  GenerateAnswerOutput,
  LlmGateway,
} from '../llm-gateway.interface';

const DEFAULT_MAX_TOKENS = 1024;

@Injectable()
export class AnthropicGateway implements LlmGateway {
  private readonly apiKey: string | undefined;

  private readonly client: AnthropicClient | undefined;

  private readonly maxTokens: number;

  private readonly model: string | undefined;

  constructor(options: AnthropicGatewayOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.model = options.model ?? process.env.ANTHROPIC_MODEL;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.client =
      options.client ??
      (this.apiKey === undefined
        ? undefined
        : new Anthropic({ apiKey: this.apiKey }));
  }

  async generateAnswer(
    input: GenerateAnswerInput,
  ): Promise<GenerateAnswerOutput> {
    const client = this.getClient();
    const model = this.getModel();

    const response = await client.messages.create({
      max_tokens: this.maxTokens,
      messages: [
        {
          content: input.prompt,
          role: 'user',
        },
      ],
      model,
    });

    return {
      content: this.extractText(response.content),
    };
  }

  private getClient(): AnthropicClient {
    if (this.apiKey === undefined || this.apiKey.trim() === '') {
      throw new Error(
        'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic.',
      );
    }

    if (this.client === undefined) {
      throw new Error('Anthropic client is not configured.');
    }

    return this.client;
  }

  private getModel(): string {
    if (this.model === undefined || this.model.trim() === '') {
      throw new Error(
        'ANTHROPIC_MODEL is required when LLM_PROVIDER=anthropic.',
      );
    }

    return this.model;
  }

  private extractText(content: ContentBlock[]): string {
    return content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
  }
}
