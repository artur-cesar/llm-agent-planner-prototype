import { ToolDefinition } from './tool-definition.interface';

export const getOrderStatusToolDefinition: ToolDefinition = {
  description: 'Get the current status of a customer order by order ID.',
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
  name: 'getOrderStatus',
};

export const getOrderItemsToolDefinition: ToolDefinition = {
  description: 'Get the list of items associated with an order by order ID.',
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
  name: 'getOrderItems',
};

export const toolDefinitions: ToolDefinition[] = [
  getOrderStatusToolDefinition,
  getOrderItemsToolDefinition,
];
