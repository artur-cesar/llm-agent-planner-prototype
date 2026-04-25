import { InternalServerErrorException } from '@nestjs/common';

import type { Planner, PlannerDecision } from '../planner/planner.interface';

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
        messages: [{ content: 'hello', role: 'user' }],
        systemPrompt: 'test system',
        tools: [],
      }),
    ).resolves.toEqual({
      content: 'Direct answer',
      generatedMessages: [
        {
          content: 'Direct answer',
          role: 'assistant',
        },
      ],
    });
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
      messages: [{ content: 'What is the status of order 123?', role: 'user' }],
      systemPrompt: 'test system',
      tools: [],
    });

    expect(result).toMatchObject({
      content: 'Order 123 is currently PAID.',
      generatedMessages: [
        {
          arguments: { orderId: '123' },
          content: 'Checking the order for you.',
          metadata: {
            arguments: { orderId: '123' },
            toolName: 'getOrderStatus',
            toolUseId: 'toolu_status_123',
          },
          role: 'assistant',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_status_123',
        },
        {
          metadata: {
            arguments: { orderId: '123' },
            result: {
              arguments: { orderId: '123' },
              attempt: 1,
              data: { orderId: '123', status: 'PAID' },
              success: true,
              toolName: 'getOrderStatus',
              type: 'tool_success',
            },
            toolName: 'getOrderStatus',
            toolUseId: 'toolu_status_123',
          },
          role: 'tool',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_status_123',
        },
        {
          content: 'Order 123 is currently PAID.',
          role: 'assistant',
        },
      ],
    });

    expect(JSON.parse(result.generatedMessages[1].content)).toMatchObject({
      arguments: { orderId: '123' },
      data: { orderId: '123', status: 'PAID' },
      success: true,
      toolName: 'getOrderStatus',
      type: 'tool_success',
    });
    expect(
      typeof (
        JSON.parse(result.generatedMessages[1].content) as {
          durationMs: number;
        }
      ).durationMs,
    ).toBe('number');
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
          metadata: {
            result: {
              success: true,
              toolName: 'getOrderStatus',
              type: 'tool_success',
            },
          },
          role: 'tool',
          toolName: 'getOrderStatus',
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
          metadata: {
            result: {
              success: true,
              toolName: 'getOrderItems',
              type: 'tool_success',
            },
          },
          role: 'tool',
          toolName: 'getOrderItems',
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
      metadata: {
        result: {
          success: true,
          type: 'tool_success',
        },
      },
      role: 'tool',
      toolName: 'getOrderStatus',
    });
    expect(result.generatedMessages[2]).toMatchObject({
      role: 'assistant',
      toolName: 'getOrderItems',
    });
    expect(result.generatedMessages[3]).toMatchObject({
      metadata: {
        result: {
          reason: 'TIMEOUT',
          retryable: true,
          success: false,
          type: 'tool_error',
        },
      },
      role: 'tool',
      toolName: 'getOrderItems',
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
          { content: 'What is the status of order 123?', role: 'user' },
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
          { content: 'What is the status of order 123?', role: 'user' },
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
  decisions: PlannerDecision[],
  configureExecutor?: (executor: ToolExecutorService) => void,
  limits?: {
    maxIterations?: number;
    maxLlmCalls?: number;
    maxToolCalls?: number;
  },
): TurnRunnerService {
  const planner: Planner = {
    decide: jest
      .fn<Promise<PlannerDecision>, []>()
      .mockImplementation(() =>
        Promise.resolve(decisions.shift() as PlannerDecision),
      ),
  };

  const toolExecutorService = new ToolExecutorService(new OrderRepository());
  toolExecutorService.setRuntimeConfig({
    baseDelayMs: 0,
    defaultTimeoutMs: 20,
    maxAttempts: 2,
  });
  configureExecutor?.(toolExecutorService);

  const runner = new TurnRunnerService(planner as never, toolExecutorService);

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
