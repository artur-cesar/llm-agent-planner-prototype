import { toolDefinitions } from '../../tools/tool-definitions';
import { FakeLlmGateway } from './fake-llm.gateway';

describe('FakeLlmGateway', () => {
  it('should return a deterministic fake response', () => {
    const gateway = new FakeLlmGateway();

    expect(
      gateway.generateAnswer({
        messages: [{ content: 'test prompt', role: 'user' }],
        tools: toolDefinitions,
      }),
    ).toEqual({
      content: 'Fake LLM response: test prompt',
      type: 'final_answer',
    });
  });

  it('should ask for clarification when the order ID is missing', () => {
    const gateway = new FakeLlmGateway();

    expect(
      gateway.generateAnswer({
        messages: [
          { content: 'What is the status of my order?', role: 'user' },
        ],
        tools: toolDefinitions,
      }),
    ).toEqual({
      content: 'I can help with that. Which order ID should I check for you?',
      type: 'final_answer',
    });
  });

  it('should return a tool call when the order ID is provided', () => {
    const gateway = new FakeLlmGateway();

    expect(
      gateway.generateAnswer({
        messages: [
          { content: 'Show me the items in order 123.', role: 'user' },
        ],
        tools: toolDefinitions,
      }),
    ).toEqual({
      arguments: { orderId: '123' },
      content: 'Checking getOrderItems for order 123.',
      toolName: 'getOrderItems',
      toolUseId: 'fake-tool-use-getOrderItems-123',
      type: 'tool_call',
    });
  });

  it('should convert tool results into a final answer', () => {
    const gateway = new FakeLlmGateway();

    expect(
      gateway.generateAnswer({
        messages: [
          {
            arguments: { orderId: '123' },
            content: 'Checking getOrderStatus for order 123.',
            role: 'assistant',
            toolName: 'getOrderStatus',
            toolUseId: 'fake-tool-use-getOrderStatus-123',
          },
          {
            content:
              '{"type":"tool_success","toolName":"getOrderStatus","arguments":{"orderId":"123"},"data":{"orderId":"123","status":"PAID"},"durationMs":1,"attempt":1,"success":true}',
            role: 'tool',
            toolName: 'getOrderStatus',
            toolUseId: 'fake-tool-use-getOrderStatus-123',
          },
        ],
        tools: toolDefinitions,
      }),
    ).toEqual({
      content: 'Order 123 is currently PAID.',
      type: 'final_answer',
    });
  });

  it('should request another tool when the prompt needs status and items', () => {
    const gateway = new FakeLlmGateway();

    expect(
      gateway.generateAnswer({
        messages: [
          {
            content: 'What is the status and items of order 123?',
            role: 'user',
          },
          {
            arguments: { orderId: '123' },
            content: 'Checking getOrderStatus for order 123.',
            role: 'assistant',
            toolName: 'getOrderStatus',
            toolUseId: 'fake-tool-use-getOrderStatus-123',
          },
          {
            content:
              '{"type":"tool_success","toolName":"getOrderStatus","arguments":{"orderId":"123"},"data":{"orderId":"123","status":"PAID"},"durationMs":1,"attempt":1,"success":true}',
            role: 'tool',
            toolName: 'getOrderStatus',
            toolUseId: 'fake-tool-use-getOrderStatus-123',
          },
        ],
        tools: toolDefinitions,
      }),
    ).toEqual({
      arguments: { orderId: '123' },
      content: 'Checking getOrderItems for order 123.',
      toolName: 'getOrderItems',
      toolUseId: 'fake-tool-use-getOrderItems-123',
      type: 'tool_call',
    });
  });

  it('should combine multiple tool results into one final answer', () => {
    const gateway = new FakeLlmGateway();

    expect(
      gateway.generateAnswer({
        messages: [
          {
            content: 'What is the status and items of order 123?',
            role: 'user',
          },
          {
            arguments: { orderId: '123' },
            content: 'Checking getOrderStatus for order 123.',
            role: 'assistant',
            toolName: 'getOrderStatus',
            toolUseId: 'fake-tool-use-getOrderStatus-123',
          },
          {
            content:
              '{"type":"tool_success","toolName":"getOrderStatus","arguments":{"orderId":"123"},"data":{"orderId":"123","status":"PAID"},"durationMs":1,"attempt":1,"success":true}',
            role: 'tool',
            toolName: 'getOrderStatus',
            toolUseId: 'fake-tool-use-getOrderStatus-123',
          },
          {
            arguments: { orderId: '123' },
            content: 'Checking getOrderItems for order 123.',
            role: 'assistant',
            toolName: 'getOrderItems',
            toolUseId: 'fake-tool-use-getOrderItems-123',
          },
          {
            content:
              '{"type":"tool_success","toolName":"getOrderItems","arguments":{"orderId":"123"},"data":{"orderId":"123","found":true,"items":["Keyboard","Mouse"]},"durationMs":1,"attempt":1,"success":true}',
            role: 'tool',
            toolName: 'getOrderItems',
            toolUseId: 'fake-tool-use-getOrderItems-123',
          },
        ],
        tools: toolDefinitions,
      }),
    ).toEqual({
      content:
        'Order 123 is currently PAID. Order 123 contains: Keyboard, Mouse.',
      type: 'final_answer',
    });
  });

  it('should explain partial success when a tool fails', () => {
    const gateway = new FakeLlmGateway();

    expect(
      gateway.generateAnswer({
        messages: [
          {
            content: 'What is the status and items of order 123?',
            role: 'user',
          },
          {
            arguments: { orderId: '123' },
            content: 'Checking getOrderStatus for order 123.',
            role: 'assistant',
            toolName: 'getOrderStatus',
            toolUseId: 'fake-tool-use-getOrderStatus-123',
          },
          {
            content:
              '{"type":"tool_success","toolName":"getOrderStatus","arguments":{"orderId":"123"},"data":{"orderId":"123","status":"PAID"},"durationMs":1,"attempt":1,"success":true}',
            role: 'tool',
            toolName: 'getOrderStatus',
            toolUseId: 'fake-tool-use-getOrderStatus-123',
          },
          {
            arguments: { orderId: '123' },
            content: 'Checking getOrderItems for order 123.',
            role: 'assistant',
            toolName: 'getOrderItems',
            toolUseId: 'fake-tool-use-getOrderItems-123',
          },
          {
            content:
              '{"type":"tool_error","toolName":"getOrderItems","arguments":{"orderId":"123"},"message":"Tool execution timed out.","reason":"TIMEOUT","retryable":true,"durationMs":5,"attempt":1,"success":false}',
            role: 'tool',
            toolName: 'getOrderItems',
            toolUseId: 'fake-tool-use-getOrderItems-123',
          },
        ],
        tools: toolDefinitions,
      }),
    ).toEqual({
      content:
        'Order 123 is currently PAID. I could not load the items for order 123 because the tool timed out.',
      type: 'final_answer',
    });
  });
});
