import type { LlmGateway } from '../llm/llm-gateway.interface';

import { LlmPlanner } from './llm-planner';

describe('LlmPlanner', () => {
  let llmGateway: jest.Mocked<LlmGateway>;
  let planner: LlmPlanner;

  beforeEach(() => {
    llmGateway = {
      generateAnswer: jest.fn(),
    };

    planner = new LlmPlanner(llmGateway);
  });

  it('should map a final answer decision from the llm gateway', async () => {
    llmGateway.generateAnswer.mockResolvedValue({
      content: 'Final answer',
      type: 'final_answer',
    });

    await expect(
      planner.decide({
        messages: [{ content: 'test', role: 'user' }],
        systemPrompt: 'test system',
        tools: [],
      }),
    ).resolves.toEqual({
      content: 'Final answer',
      type: 'final_answer',
    });
  });

  it('should map a tool call decision from the llm gateway', async () => {
    llmGateway.generateAnswer.mockResolvedValue({
      arguments: { orderId: '123' },
      content: 'Checking the order for you.',
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
      type: 'tool_call',
    });

    await expect(
      planner.decide({
        messages: [{ content: 'test', role: 'user' }],
        systemPrompt: 'test system',
        tools: [],
      }),
    ).resolves.toEqual({
      arguments: { orderId: '123' },
      content: 'Checking the order for you.',
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
      type: 'tool_call',
    });
  });
});
