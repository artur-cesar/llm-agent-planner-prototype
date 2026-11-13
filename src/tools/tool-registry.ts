import { Injectable } from '@nestjs/common';

import type { ToolDefinition } from './tool-definition.interface';

import { OrderRepository } from '../order/order.repository';

export interface RegisteredTool {
  definition: ToolDefinition;
  execute(
    input: Record<string, string>,
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
}

@Injectable()
export class ToolRegistry {
  private readonly tools: RegisteredTool[];

  constructor(orderRepository: OrderRepository) {
    // This static list is the only place that associates a tool's public
    // definition with its implementation. All tools here are read-only.
    this.tools = [
      {
        definition: {
          name: 'getOrderStatus',
          description:
            'Get the current status of a customer order by order ID.',
          inputSchema: {
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
        },
        execute: ({ orderId }) => orderRepository.getOrderStatus(orderId),
      },
      {
        definition: {
          name: 'getOrderItems',
          description:
            'Get the list of items associated with an order by order ID.',
          inputSchema: {
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
        },
        execute: ({ orderId }) => orderRepository.getOrderItems(orderId),
      },
    ];
  }

  get definitions(): ToolDefinition[] {
    return this.tools.map((tool) => tool.definition);
  }

  find(name: string): RegisteredTool | undefined {
    return this.tools.find((tool) => tool.definition.name === name);
  }
}
