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
            content: '{"orderId":"123","status":"PAID"}',
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
});
