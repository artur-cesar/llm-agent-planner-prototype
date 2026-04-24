import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages';

import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';

import type { ToolDefinition } from '../../tools/tool-definition.interface';
import type { AnthropicClient, AnthropicGatewayOptions } from './types';

import {
  GenerateAnswerInput,
  GenerateAnswerOutput,
  LlmMessage,
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
      messages: input.messages.map((message) => this.mapMessage(message)),
      model,
      tools: input.tools.map((tool) => this.mapToolDefinition(tool)),
    });

    return this.mapResponse(response.content);
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

  private mapMessage(message: LlmMessage) {
    if (message.role === 'tool') {
      return {
        content: [
          {
            content: message.content,
            tool_use_id: message.toolUseId ?? '',
            type: 'tool_result' as const,
          },
        ],
        role: 'user' as const,
      };
    }

    if (
      message.role === 'assistant' &&
      message.toolName !== null &&
      message.toolName !== undefined &&
      message.toolUseId !== null &&
      message.toolUseId !== undefined
    ) {
      const content: Array<
        | { text: string; type: 'text' }
        | {
            id: string;
            input: Record<string, unknown>;
            name: string;
            type: 'tool_use';
          }
      > = [];

      if (message.content.trim() !== '') {
        content.push({
          text: message.content,
          type: 'text',
        });
      }

      content.push({
        id: message.toolUseId,
        input: message.arguments ?? {},
        name: message.toolName,
        type: 'tool_use',
      });

      return {
        content,
        role: 'assistant' as const,
      };
    }

    return {
      content: message.content,
      role: message.role,
    };
  }

  private mapToolDefinition(tool: ToolDefinition) {
    return {
      description: tool.description,
      input_schema: tool.inputSchema,
      name: tool.name,
    };
  }

  private mapResponse(content: ContentBlock[]): GenerateAnswerOutput {
    const toolUseBlock = content.find((block) => block.type === 'tool_use');

    if (toolUseBlock?.type === 'tool_use') {
      return {
        arguments: this.normalizeToolArguments(toolUseBlock.input),
        content: this.extractText(content),
        toolName: toolUseBlock.name,
        toolUseId: toolUseBlock.id,
        type: 'tool_call',
      };
    }

    return {
      content: this.extractText(content),
      type: 'final_answer',
    };
  }

  private normalizeToolArguments(input: unknown): Record<string, unknown> {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      return {};
    }

    return input as Record<string, unknown>;
  }
}
