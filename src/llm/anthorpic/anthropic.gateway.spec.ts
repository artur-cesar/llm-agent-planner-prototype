import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages';

import { AnthropicGateway } from './anthropic.gateway';
import { AnthropicClient } from './types';

describe('AnthropicGateway', () => {
  it('should map prompt input into an Anthropic message request', async () => {
    const create = jest.fn().mockResolvedValue({
      content: [
        {
          citations: null,
          text: 'Hello from Claude.',
          type: 'text',
        },
      ],
    });

    const gateway = createGateway(create, {
      maxTokens: 64,
      model: 'claude-sonnet-4-20250514',
    });

    await expect(
      gateway.generateAnswer({ prompt: 'Explain agents briefly.' }),
    ).resolves.toEqual({
      content: 'Hello from Claude.',
    });

    expect(create).toHaveBeenCalledWith({
      max_tokens: 64,
      messages: [
        {
          content: 'Explain agents briefly.',
          role: 'user',
        },
      ],
      model: 'claude-sonnet-4-20250514',
    });
  });

  it('should join multiple text content blocks', async () => {
    const create = jest.fn().mockResolvedValue({
      content: [
        {
          citations: null,
          text: 'First.',
          type: 'text',
        },
        {
          citations: null,
          text: 'Second.',
          type: 'text',
        },
      ],
    });

    const gateway = createGateway(create);

    await expect(gateway.generateAnswer({ prompt: 'test' })).resolves.toEqual({
      content: 'First.\nSecond.',
    });
  });

  it('should safely fallback when Anthropic returns no text blocks', async () => {
    const create = jest.fn().mockResolvedValue({
      content: [
        {
          id: 'toolu_test',
          input: {},
          name: 'noop',
          type: 'tool_use',
        },
      ] as unknown as ContentBlock[],
    });

    const gateway = createGateway(create);

    await expect(gateway.generateAnswer({ prompt: 'test' })).resolves.toEqual({
      content: '',
    });
  });

  it('should fail clearly when credentials are missing', async () => {
    const create = jest.fn();
    const gateway = new AnthropicGateway({
      client: {
        messages: {
          create,
        },
      },
      model: 'claude-sonnet-4-20250514',
    });

    await expect(gateway.generateAnswer({ prompt: 'test' })).rejects.toThrow(
      'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic.',
    );
    expect(create).not.toHaveBeenCalled();
  });
});

function createGateway(
  create: jest.Mock,
  options: { maxTokens?: number; model?: string } = {},
): AnthropicGateway {
  const client: AnthropicClient = {
    messages: {
      create,
    },
  };

  return new AnthropicGateway({
    apiKey: 'test-api-key',
    client,
    maxTokens: options.maxTokens,
    model: options.model ?? 'claude-sonnet-4-20250514',
  });
}
