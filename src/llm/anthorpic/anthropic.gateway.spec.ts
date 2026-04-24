import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages';

import { toolDefinitions } from '../../tools/tool-definitions';
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
      gateway.generateAnswer({
        messages: [{ content: 'Explain agents briefly.', role: 'user' }],
        tools: toolDefinitions,
      }),
    ).resolves.toEqual({
      content: 'Hello from Claude.',
      type: 'final_answer',
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
      tools: [
        {
          description:
            'Get the current status of a customer order by order ID.',
          input_schema: {
            additionalProperties: false,
            properties: {
              orderId: {
                description: 'The order identifier to look up.',
                type: 'string',
              },
            },
            required: ['orderId'],
            type: 'object',
          },
          name: 'getOrderStatus',
        },
        {
          description:
            'Get the list of items associated with an order by order ID.',
          input_schema: {
            additionalProperties: false,
            properties: {
              orderId: {
                description: 'The order identifier to inspect.',
                type: 'string',
              },
            },
            required: ['orderId'],
            type: 'object',
          },
          name: 'getOrderItems',
        },
      ],
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

    await expect(
      gateway.generateAnswer({
        messages: [{ content: 'test', role: 'user' }],
        tools: [],
      }),
    ).resolves.toEqual({ content: 'First.\nSecond.', type: 'final_answer' });
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

    await expect(
      gateway.generateAnswer({
        messages: [{ content: 'test', role: 'user' }],
        tools: [],
      }),
    ).resolves.toEqual({
      arguments: {},
      content: '',
      toolName: 'noop',
      toolUseId: 'toolu_test',
      type: 'tool_call',
    });
  });

  it('should map Anthropic tool use responses into the shared contract', async () => {
    const create = jest.fn().mockResolvedValue({
      content: [
        {
          citations: null,
          text: 'Checking the order for you.',
          type: 'text',
        },
        {
          id: 'toolu_123',
          input: { orderId: '123' },
          name: 'getOrderStatus',
          type: 'tool_use',
        },
      ] as unknown as ContentBlock[],
    });

    const gateway = createGateway(create);

    await expect(
      gateway.generateAnswer({
        messages: [
          { content: 'What is the status of order 123?', role: 'user' },
        ],
        tools: toolDefinitions,
      }),
    ).resolves.toEqual({
      arguments: { orderId: '123' },
      content: 'Checking the order for you.',
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
      type: 'tool_call',
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

    await expect(
      gateway.generateAnswer({
        messages: [{ content: 'test', role: 'user' }],
        tools: [],
      }),
    ).rejects.toThrow(
      'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic.',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('should map persisted assistant tool calls and tool results into Anthropic messages', async () => {
    const create = jest.fn().mockResolvedValue({
      content: [
        {
          citations: null,
          text: 'Order 123 is currently PAID.',
          type: 'text',
        },
      ],
    });

    const gateway = createGateway(create);

    await expect(
      gateway.generateAnswer({
        messages: [
          { content: 'What is the status of order 123?', role: 'user' },
          {
            arguments: { orderId: '123' },
            content: 'Checking the order for you.',
            role: 'assistant',
            toolName: 'getOrderStatus',
            toolUseId: 'toolu_123',
          },
          {
            content: '{"orderId":"123","status":"PAID"}',
            role: 'tool',
            toolName: 'getOrderStatus',
            toolUseId: 'toolu_123',
          },
        ],
        tools: toolDefinitions,
      }),
    ).resolves.toEqual({
      content: 'Order 123 is currently PAID.',
      type: 'final_answer',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            content: 'What is the status of order 123?',
            role: 'user',
          },
          {
            content: [
              {
                text: 'Checking the order for you.',
                type: 'text',
              },
              {
                id: 'toolu_123',
                input: { orderId: '123' },
                name: 'getOrderStatus',
                type: 'tool_use',
              },
            ],
            role: 'assistant',
          },
          {
            content: [
              {
                content: '{"orderId":"123","status":"PAID"}',
                tool_use_id: 'toolu_123',
                type: 'tool_result',
              },
            ],
            role: 'user',
          },
        ],
      }),
    );
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
