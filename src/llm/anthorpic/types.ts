import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages';

export interface AnthropicClient {
  messages: {
    create(input: {
      max_tokens: number;
      messages: Array<{
        content: string;
        role: 'user';
      }>;
      model: string;
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
