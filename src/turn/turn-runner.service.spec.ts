import { InternalServerErrorException } from '@nestjs/common';

import type {
  LlmGateway,
  GenerateAnswerOutput,
} from '../llm/llm-gateway.interface';

import { OrderRepository } from '../order/order.repository';
import { ToolExecutorService } from '../tools/tool-executor.service';
import { TurnRunnerService } from './turn-runner.service';

describe('TurnRunnerService', () => {
  it('should return immediately on a direct final answer', async () => {
    const runner = createRunner([
      {
        content: 'Direct answer',
        type: 'final_answer',
      },
    ]);

    await expect(
      runner.run({
        messages: [{ content: 'hello', type: 'text', role: 'user' }],
        systemPrompt: 'test system',
        tools: [],
      }),
    ).resolves.toEqual({
      content: 'Direct answer',
      generatedMessages: [
        {
          content: 'Direct answer',
          role: 'assistant',
          type: 'text',
        },
      ],
    });
  });

  it('should send configuration and the generated tool history directly to the gateway', async () => {
    const generateAnswer = jest
      .fn<
        ReturnType<LlmGateway['generateAnswer']>,
        Parameters<LlmGateway['generateAnswer']>
      >()
      .mockReturnValueOnce({
        type: 'tool_call',
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_123',
        arguments: { orderId: '123' },
        content: 'Checking.',
      })
      .mockReturnValueOnce({ type: 'final_answer', content: 'PAID' });
    const runner = new TurnRunnerService(
      { generateAnswer },
      new ToolExecutorService(new OrderRepository()),
    );
    const input = {
      messages: [
        {
          type: 'text' as const,
          role: 'user' as const,
          content: 'Status of 123',
        },
      ],
      systemPrompt: 'Use tools.',
      tools: [],
    };
    await runner.run(input);
    expect(generateAnswer.mock.calls[0][0]).toEqual({
      messages: input.messages,
      system: 'Use tools.',
      tools: [],
    });
    expect(generateAnswer.mock.calls[1][0].messages).toEqual([
      ...input.messages,
      {
        type: 'tool_call',
        role: 'assistant',
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_123',
        arguments: { orderId: '123' },
        content: 'Checking.',
      },
      expect.objectContaining({
        type: 'tool_result',
        role: 'tool',
        toolUseId: 'toolu_123',
      }),
    ]);
    const toolResult = generateAnswer.mock.calls[1][0].messages[2];
    if (toolResult.type !== 'tool_result')
      throw new Error('Expected tool result');
    expect(toolResult.result.success).toBe(true);
    expect(input.messages).toHaveLength(1);
  });

  it('should execute a single tool call and then return the final answer', async () => {
    const runner = createRunner([
      {
        arguments: { orderId: '123' },
        content: 'Checking the order for you.',
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_status_123',
        type: 'tool_call',
      },
      {
        content: 'Order 123 is currently PAID.',
        type: 'final_answer',
      },
    ]);

    const result = await runner.run({
      messages: [
        {
          content: 'What is the status of order 123?',
          type: 'text',
          role: 'user',
        },
      ],
      systemPrompt: 'test system',
      tools: [],
    });

    expect(result).toMatchObject({
      content: 'Order 123 is currently PAID.',
      generatedMessages: [
        {
          arguments: { orderId: '123' },
          content: 'Checking the order for you.',
          role: 'assistant',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_status_123',
        },
        {
          result: {
            arguments: { orderId: '123' },
            attempt: 1,
            data: { orderId: '123', status: 'PAID' },
            success: true,
            toolName: 'getOrderStatus',
            type: 'tool_success',
          },
          role: 'tool',
          toolUseId: 'toolu_status_123',
        },
        {
          content: 'Order 123 is currently PAID.',
          role: 'assistant',
        },
      ],
    });

    const toolResult = result.generatedMessages[1];
    if (toolResult.type !== 'tool_result')
      throw new Error('Expected tool result');
    expect(toolResult.result).toMatchObject({
      arguments: { orderId: '123' },
      data: { orderId: '123', status: 'PAID' },
      success: true,
      toolName: 'getOrderStatus',
      type: 'tool_success',
    });
    expect(typeof toolResult.result.durationMs).toBe('number');
  });

  it('should execute multiple tool calls in sequence and return the combined final answer', async () => {
    const runner = createRunner([
      {
        arguments: { orderId: '123' },
        content: 'Checking the order status.',
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_status_123',
        type: 'tool_call',
      },
      {
        arguments: { orderId: '123' },
        content: 'Checking the order items.',
        toolName: 'getOrderItems',
        toolUseId: 'toolu_items_123',
        type: 'tool_call',
      },
      {
        content:
          'Order 123 is currently PAID. Order 123 contains: Keyboard, Mouse.',
        type: 'final_answer',
      },
    ]);

    await expect(
      runner.run({
        messages: [
          {
            content: 'What is the status and items of order 123?',
            type: 'text',
            role: 'user',
          },
        ],
        systemPrompt: 'test system',
        tools: [],
      }),
    ).resolves.toMatchObject({
      content:
        'Order 123 is currently PAID. Order 123 contains: Keyboard, Mouse.',
      generatedMessages: [
        {
          arguments: { orderId: '123' },
          content: 'Checking the order status.',
          role: 'assistant',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_status_123',
        },
        {
          result: {
            success: true,
            toolName: 'getOrderStatus',
            type: 'tool_success',
          },
          role: 'tool',
          toolUseId: 'toolu_status_123',
        },
        {
          arguments: { orderId: '123' },
          content: 'Checking the order items.',
          role: 'assistant',
          toolName: 'getOrderItems',
          toolUseId: 'toolu_items_123',
        },
        {
          result: {
            success: true,
            toolName: 'getOrderItems',
            type: 'tool_success',
          },
          role: 'tool',
          toolUseId: 'toolu_items_123',
        },
        {
          content:
            'Order 123 is currently PAID. Order 123 contains: Keyboard, Mouse.',
          role: 'assistant',
        },
      ],
    });
  });

  it('should keep tool errors in the message flow so the planner can answer with partial success', async () => {
    const runner = createRunner(
      [
        {
          arguments: { orderId: '123' },
          content: 'Checking status.',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_status_123',
          type: 'tool_call',
        },
        {
          arguments: { orderId: '123' },
          content: 'Checking items.',
          toolName: 'getOrderItems',
          toolUseId: 'toolu_items_123',
          type: 'tool_call',
        },
        {
          content:
            'Order 123 is currently PAID. I could not load the items for order 123 because the tool timed out.',
          type: 'final_answer',
        },
      ],
      (executor) => {
        executor.setRuntimeConfig({
          baseDelayMs: 0,
          defaultTimeoutMs: 5,
          maxAttempts: 1,
        });
        executor.setToolBehavior('getOrderItems', {
          delayMs: 10,
        });
      },
    );

    const result = await runner.run({
      messages: [
        {
          content: 'What is the status and items of order 123?',
          type: 'text',
          role: 'user',
        },
      ],
      systemPrompt: 'test system',
      tools: [],
    });

    expect(result.content).toBe(
      'Order 123 is currently PAID. I could not load the items for order 123 because the tool timed out.',
    );
    expect(result.generatedMessages).toHaveLength(5);
    expect(result.generatedMessages[0]).toMatchObject({
      role: 'assistant',
      toolName: 'getOrderStatus',
    });
    expect(result.generatedMessages[1]).toMatchObject({
      result: {
        success: true,
        type: 'tool_success',
      },
      role: 'tool',
    });
    expect(result.generatedMessages[2]).toMatchObject({
      role: 'assistant',
      toolName: 'getOrderItems',
    });
    expect(result.generatedMessages[3]).toMatchObject({
      result: {
        reason: 'TIMEOUT',
        retryable: true,
        success: false,
        type: 'tool_error',
      },
      role: 'tool',
    });
    expect(result.generatedMessages[4]).toMatchObject({
      content:
        'Order 123 is currently PAID. I could not load the items for order 123 because the tool timed out.',
      role: 'assistant',
    });
  });

  it('should fail explicitly when the max iteration limit is reached', async () => {
    const runner = createRunner(
      [
        {
          arguments: { orderId: '123' },
          content: 'Checking the order status.',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_status_123',
          type: 'tool_call',
        },
        {
          arguments: { orderId: '123' },
          content: 'Checking the order items.',
          toolName: 'getOrderItems',
          toolUseId: 'toolu_items_123',
          type: 'tool_call',
        },
      ],
      undefined,
      { maxIterations: 1 },
    );

    await expect(
      runner.run({
        messages: [
          {
            content: 'What is the status of order 123?',
            type: 'text',
            role: 'user',
          },
        ],
        systemPrompt: 'test system',
        tools: [],
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('should fail explicitly when the max tool call budget is reached', async () => {
    const runner = createRunner(
      [
        {
          arguments: { orderId: '123' },
          content: 'Checking status.',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_status_123',
          type: 'tool_call',
        },
        {
          arguments: { orderId: '123' },
          content: 'Checking items.',
          toolName: 'getOrderItems',
          toolUseId: 'toolu_items_123',
          type: 'tool_call',
        },
      ],
      undefined,
      { maxToolCalls: 1 },
    );

    await expect(
      runner.run({
        messages: [
          {
            content: 'What is the status and items of order 123?',
            type: 'text',
            role: 'user',
          },
        ],
        systemPrompt: 'test system',
        tools: [],
      }),
    ).rejects.toThrow(
      'Planner exceeded the max tool call limit (1) for the current turn.',
    );
  });

  it('should fail explicitly when the max llm call budget is reached', async () => {
    const runner = createRunner(
      [
        {
          arguments: { orderId: '123' },
          content: 'Checking status.',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_status_123',
          type: 'tool_call',
        },
        {
          content: 'Should never be reached',
          type: 'final_answer',
        },
      ],
      undefined,
      { maxLlmCalls: 1 },
    );

    await expect(
      runner.run({
        messages: [
          {
            content: 'What is the status of order 123?',
            type: 'text',
            role: 'user',
          },
        ],
        systemPrompt: 'test system',
        tools: [],
      }),
    ).rejects.toThrow(
      'Planner exceeded the max LLM call limit (1) for the current turn.',
    );
  });
});

function createRunner(
  decisions: GenerateAnswerOutput[],
  configureExecutor?: (executor: ToolExecutorService) => void,
  limits?: {
    maxIterations?: number;
    maxLlmCalls?: number;
    maxToolCalls?: number;
  },
): TurnRunnerService {
  const gateway: LlmGateway = {
    generateAnswer: jest.fn(() => {
      const decision = decisions.shift();
      if (decision === undefined)
        throw new Error('No programmed decision remains');
      return Promise.resolve(decision);
    }),
  };

  const toolExecutorService = new ToolExecutorService(new OrderRepository());
  toolExecutorService.setRuntimeConfig({
    baseDelayMs: 0,
    defaultTimeoutMs: 20,
    maxAttempts: 2,
  });
  configureExecutor?.(toolExecutorService);

  const runner = new TurnRunnerService(gateway, toolExecutorService);

  if (limits?.maxIterations !== undefined) {
    (runner as unknown as { maxIterations: number }).maxIterations =
      limits.maxIterations;
  }

  if (limits?.maxLlmCalls !== undefined) {
    (runner as unknown as { maxLlmCalls: number }).maxLlmCalls =
      limits.maxLlmCalls;
  }

  if (limits?.maxToolCalls !== undefined) {
    (runner as unknown as { maxToolCalls: number }).maxToolCalls =
      limits.maxToolCalls;
  }

  return runner;
}
