import type {
  ContentBlock,
  StopReason,
} from '@anthropic-ai/sdk/resources/messages';

import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';

import type { ToolDefinition } from '../../tools/tool-definition.interface';
import type { AnthropicClient, AnthropicGatewayOptions } from './types';

import {
  GenerateAnswerInput,
  GenerateAnswerOutput,
  LlmMessage,
  LlmGateway,
} from '../llm-gateway.interface';

const DEFAULT_MAX_TOKENS = 512;

@Injectable()
export class AnthropicGateway implements LlmGateway {
  private readonly logger = new Logger(AnthropicGateway.name);

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
    const mappedMessages = input.messages.map((message) =>
      this.mapMessage(message),
    );
    const toolNames = input.tools.map((tool) => tool.name).join(',');

    this.logger.log(
      `anthropic:request model=${model} messages=${input.messages.length} tools=[${toolNames}] system=${String(
        input.system !== undefined,
      )}`,
    );

    const response = await client.messages.create({
      max_tokens: this.maxTokens,
      messages: mappedMessages,
      model,
      system: input.system,
      tools: input.tools.map((tool) => this.mapToolDefinition(tool)),
      ...(input.tools.length > 0
        ? {
            tool_choice: {
              type: 'auto' as const,
              disable_parallel_tool_use: true as const,
            },
          }
        : {}),
    });
    const mappedResponse = this.mapResponse(
      response.content,
      response.stop_reason,
    );

    this.logger.log(
      `anthropic:response type=${mappedResponse.type}${
        mappedResponse.type === 'tool_call'
          ? ` toolName=${mappedResponse.toolName}`
          : ''
      } textLength=${mappedResponse.content.length}`,
    );

    return mappedResponse;
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
    if (message.type === 'tool_result') {
      return {
        content: [
          {
            content: JSON.stringify(message.result),
            tool_use_id: message.toolUseId,
            type: 'tool_result' as const,
          },
        ],
        role: 'user' as const,
      };
    }

    if (message.type === 'tool_call') {
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
        input: message.arguments,
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

  private mapResponse(
    content: ContentBlock[],
    stopReason: StopReason | null,
  ): GenerateAnswerOutput {
    if (stopReason === 'max_tokens') {
      throw new Error('Anthropic response was truncated by the token limit.');
    }

    const toolCalls = content.filter((block) => block.type === 'tool_use');
    if (toolCalls.length > 1) {
      throw new Error('Expected at most one tool call per Anthropic response.');
    }
    const toolUseBlock = toolCalls[0];

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
