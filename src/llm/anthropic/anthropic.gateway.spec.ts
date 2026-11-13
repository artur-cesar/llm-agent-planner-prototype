import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages';

import { toolDefinitions } from '../../tools/tool-definitions';
import { AnthropicGateway } from './anthropic.gateway';
import { AnthropicClient } from './types';

describe('AnthropicGateway', () => {
  it('should map prompt input into an Anthropic message request', async () => {
    const create = jest.fn().mockResolvedValue({
      stop_reason: 'end_turn',
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
        messages: [
          { content: 'Explain agents briefly.', type: 'text', role: 'user' },
        ],
        system: 'Stay within the tool-calling policy.',
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
      system: 'Stay within the tool-calling policy.',
      tool_choice: { type: 'auto', disable_parallel_tool_use: true },
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
      stop_reason: 'end_turn',
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
        messages: [{ content: 'test', type: 'text', role: 'user' }],
        system: 'Test system prompt.',
        tools: [],
      }),
    ).resolves.toEqual({ content: 'First.\nSecond.', type: 'final_answer' });
  });

  it('should safely fallback when Anthropic returns no text blocks', async () => {
    const create = jest.fn().mockResolvedValue({
      stop_reason: 'tool_use',
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
        messages: [{ content: 'test', type: 'text', role: 'user' }],
        system: 'Test system prompt.',
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
      stop_reason: 'tool_use',
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
          {
            content: 'What is the status of order 123?',
            type: 'text',
            role: 'user',
          },
        ],
        system: 'Use tools when needed.',
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

  it('should reject multiple tool calls before returning a decision', async () => {
    const create = jest.fn().mockResolvedValue({
      stop_reason: 'tool_use',
      content: ['getOrderStatus', 'getOrderItems'].map((name, index) => ({
        type: 'tool_use',
        id: `toolu_${index}`,
        name,
        input: { orderId: '123' },
      })),
    });
    await expect(
      createGateway(create).generateAnswer({
        messages: [
          {
            type: 'text',
            role: 'user',
            content: 'Status and items of order 123',
          },
        ],
        tools: toolDefinitions,
      }),
    ).rejects.toThrow('Expected at most one tool call');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'should reject truncated responses, including tool calls=%s',
    async (withTool) => {
      const create = jest.fn().mockResolvedValue({
        stop_reason: 'max_tokens',
        content: withTool
          ? [
              {
                type: 'tool_use',
                id: 'toolu_partial',
                name: 'getOrderStatus',
                input: {},
              },
            ]
          : [{ type: 'text', text: 'Order 123 is' }],
      });
      await expect(
        createGateway(create).generateAnswer({
          messages: [
            { type: 'text', role: 'user', content: 'Status of order 123' },
          ],
          tools: toolDefinitions,
        }),
      ).rejects.toThrow('truncated by the token limit');
    },
  );

  it('should omit tool choice when no tools are available', async () => {
    const create = jest
      .fn<
        ReturnType<AnthropicClient['messages']['create']>,
        Parameters<AnthropicClient['messages']['create']>
      >()
      .mockResolvedValue({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hello.', citations: null }],
      });
    await createGateway(create).generateAnswer({
      messages: [{ type: 'text', role: 'user', content: 'Hello' }],
      tools: [],
    });
    expect(create.mock.calls[0][0]).not.toHaveProperty('tool_choice');
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
        messages: [{ content: 'test', type: 'text', role: 'user' }],
        system: 'Test system prompt.',
        tools: [],
      }),
    ).rejects.toThrow(
      'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic.',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('should map persisted assistant tool calls and tool results into Anthropic messages', async () => {
    const create = jest.fn().mockResolvedValue({
      stop_reason: 'end_turn',
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
          {
            content: 'What is the status of order 123?',
            type: 'text',
            role: 'user',
          },
          {
            type: 'tool_call',
            arguments: { orderId: '123' },
            content: 'Checking the order for you.',
            role: 'assistant',
            toolName: 'getOrderStatus',
            toolUseId: 'toolu_123',
          },
          {
            type: 'tool_result',
            role: 'tool',
            result: {
              type: 'tool_success',
              success: true,
              toolName: 'getOrderStatus',
              arguments: { orderId: '123' },
              attempt: 1,
              durationMs: 0,
              data: { orderId: '123', status: 'PAID' },
            },
            toolUseId: 'toolu_123',
          },
        ],
        system: 'Use tools when needed.',
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
                content: JSON.stringify({
                  type: 'tool_success',
                  success: true,
                  toolName: 'getOrderStatus',
                  arguments: { orderId: '123' },
                  attempt: 1,
                  durationMs: 0,
                  data: { orderId: '123', status: 'PAID' },
                }),
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
