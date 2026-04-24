import { BadRequestException } from '@nestjs/common';

import { OrderRepository } from '../order/order.repository';
import { ToolExecutorService } from './tool-executor.service';

describe('ToolExecutorService', () => {
  let service: ToolExecutorService;

  beforeEach(() => {
    service = new ToolExecutorService(new OrderRepository());
  });

  it('should execute getOrderStatus', () => {
    expect(service.execute('getOrderStatus', { orderId: '123' })).toEqual({
      result: { orderId: '123', status: 'PAID' },
      toolName: 'getOrderStatus',
    });
  });

  it('should execute getOrderItems', () => {
    expect(service.execute('getOrderItems', { orderId: '456' })).toEqual({
      result: { found: true, items: ['Monitor'], orderId: '456' },
      toolName: 'getOrderItems',
    });
  });

  it('should reject unsupported tools safely', () => {
    expect(() =>
      service.execute('unsupportedTool', { orderId: '123' }),
    ).toThrow(new BadRequestException('Unsupported tool: unsupportedTool'));
  });
});
