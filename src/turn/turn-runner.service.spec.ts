import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

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

    await expect(
      runner.run({
        messages: [
          { content: 'What is the status of order 123?', role: 'user' },
        ],
        systemPrompt: 'test system',
        tools: [],
      }),
    ).resolves.toEqual({
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
          content: '{"orderId":"123","status":"PAID"}',
          metadata: {
            result: { orderId: '123', status: 'PAID' },
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
    ).resolves.toEqual({
      content:
        'Order 123 is currently PAID. Order 123 contains: Keyboard, Mouse.',
      generatedMessages: [
        {
          arguments: { orderId: '123' },
          content: 'Checking the order status.',
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
          content: '{"orderId":"123","status":"PAID"}',
          metadata: {
            result: { orderId: '123', status: 'PAID' },
            toolName: 'getOrderStatus',
            toolUseId: 'toolu_status_123',
          },
          role: 'tool',
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_status_123',
        },
        {
          arguments: { orderId: '123' },
          content: 'Checking the order items.',
          metadata: {
            arguments: { orderId: '123' },
            toolName: 'getOrderItems',
            toolUseId: 'toolu_items_123',
          },
          role: 'assistant',
          toolName: 'getOrderItems',
          toolUseId: 'toolu_items_123',
        },
        {
          content:
            '{"orderId":"123","found":true,"items":["Keyboard","Mouse"]}',
          metadata: {
            result: {
              found: true,
              items: ['Keyboard', 'Mouse'],
              orderId: '123',
            },
            toolName: 'getOrderItems',
            toolUseId: 'toolu_items_123',
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
      1,
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

  it('should surface unsupported tool errors explicitly', async () => {
    const runner = createRunner([
      {
        arguments: { orderId: '123' },
        content: 'Checking a non existing tool.',
        toolName: 'getOrderInvoice',
        toolUseId: 'toolu_invoice_123',
        type: 'tool_call',
      },
    ]);

    await expect(
      runner.run({
        messages: [{ content: 'invoice please', role: 'user' }],
        systemPrompt: 'test system',
        tools: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function createRunner(
  decisions: PlannerDecision[],
  maxIterations?: number,
): TurnRunnerService {
  const planner: Planner = {
    decide: jest
      .fn<Promise<PlannerDecision>, []>()
      .mockImplementation(() =>
        Promise.resolve(decisions.shift() as PlannerDecision),
      ),
  };

  return new TurnRunnerService(
    planner as never,
    new ToolExecutorService(new OrderRepository()),
    maxIterations,
  );
}
