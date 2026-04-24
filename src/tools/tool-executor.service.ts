import { BadRequestException, Injectable } from '@nestjs/common';

import { OrderRepository } from '../order/order.repository';
import { ToolExecutionResult } from './tool-definition.interface';

@Injectable()
export class ToolExecutorService {
  constructor(private readonly orderRepository: OrderRepository) {}

  execute(
    toolName: string,
    input: Record<string, unknown>,
  ): ToolExecutionResult {
    const orderId = this.getOrderId(input);

    switch (toolName) {
      case 'getOrderStatus':
        return {
          result: this.orderRepository.getOrderStatus(orderId),
          toolName,
        };
      case 'getOrderItems':
        return {
          result: this.orderRepository.getOrderItems(orderId),
          toolName,
        };
      default:
        throw new BadRequestException(`Unsupported tool: ${toolName}`);
    }
  }

  private getOrderId(input: Record<string, unknown>): string {
    const orderId = input.orderId;

    if (typeof orderId !== 'string' || orderId.trim() === '') {
      throw new BadRequestException('Tool input "orderId" is required.');
    }

    return orderId;
  }
}
