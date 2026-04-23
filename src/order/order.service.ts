import { Injectable } from '@nestjs/common';

import { OrderRepository } from './order.repository';

@Injectable()
export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  getOrderStatus(orderId: string) {
    return this.orderRepository.getOrderStatus(orderId);
  }

  getOrderItems(orderId: string) {
    return this.orderRepository.getOrderItems(orderId);
  }
}
