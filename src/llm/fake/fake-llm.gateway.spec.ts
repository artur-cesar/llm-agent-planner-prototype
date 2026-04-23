import { FakeLlmGateway } from './fake-llm.gateway';

describe('FakeLlmGateway', () => {
  it('should return a deterministic fake response', () => {
    const gateway = new FakeLlmGateway();

    expect(gateway.generateAnswer({ prompt: 'test prompt' })).toEqual({
      content: 'Fake LLM response: test prompt',
      type: 'final_answer',
    });
  });
});
