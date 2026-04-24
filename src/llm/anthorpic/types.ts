import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages';

type AnthropicToolDefinition = {
  description: string;
  input_schema: {
    additionalProperties: false;
    properties: Record<
      string,
      {
        description: string;
        type: 'string';
      }
    >;
    required: string[];
    type: 'object';
  };
  name: string;
};

type AnthropicMessageContent =
  | string
  | Array<
      | {
          text: string;
          type: 'text';
        }
      | {
          id: string;
          input: Record<string, unknown>;
          name: string;
          type: 'tool_use';
        }
      | {
          content: string;
          tool_use_id: string;
          type: 'tool_result';
        }
    >;

export interface AnthropicClient {
  messages: {
    create(input: {
      max_tokens: number;
      messages: Array<{
        content: AnthropicMessageContent;
        role: 'assistant' | 'user';
      }>;
      model: string;
      system?: string;
      tools?: AnthropicToolDefinition[];
    }): Promise<{
      content: ContentBlock[];
    }>;
  };
}

export interface AnthropicGatewayOptions {
  apiKey?: string;
  client?: AnthropicClient;
  maxTokens?: number;
  model?: string;
}
