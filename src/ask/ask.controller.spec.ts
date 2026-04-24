import { AskController } from './ask.controller';
import { AskService } from './ask.service';

describe('AskController', () => {
  let askController: AskController;
  let askService: jest.Mocked<AskService>;

  beforeEach(() => {
    askService = {
      ask: jest.fn(),
    } as unknown as jest.Mocked<AskService>;

    askController = new AskController(askService);
  });

  it('should return a generated answer', async () => {
    askService.ask.mockResolvedValue({
      content: 'Fake LLM response: test',
      conversationId: 'conversation-id',
    });

    await expect(
      askController.ask({ prompt: 'test' }, 'user-id'),
    ).resolves.toEqual({
      content: 'Fake LLM response: test',
      conversationId: 'conversation-id',
    });
    expect(askService.ask.mock.calls).toEqual([
      [{ prompt: 'test' }, 'user-id'],
    ]);
  });

  it('should reject requests without prompt', async () => {
    askService.ask.mockRejectedValue(new Error('prompt is required.'));

    await expect(askController.ask(undefined as never)).rejects.toThrow(
      'prompt is required.',
    );
  });
});
