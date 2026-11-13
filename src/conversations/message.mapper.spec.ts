import type { GeneratedMessage } from '../llm/llm-gateway.interface';
import type { Message } from './entities/message.entity';

import { MessageRole } from './message-role.enum';
import { toLlmMessage, toStoredMessage } from './message.mapper';

const result = {
  type: 'tool_success' as const,
  success: true as const,
  toolName: 'getOrderStatus',
  arguments: { orderId: '123' },
  attempt: 1,
  durationMs: 2,
  data: { status: 'PAID' },
};

function stored(
  content: string,
  role: MessageRole,
  metadata: Record<string, unknown> | null,
): Message {
  return {
    id: 'legacy-message',
    conversationId: 'conversation-1',
    content,
    role,
    metadata,
  } as Message;
}

describe('message mapper', () => {
  const messages: GeneratedMessage[] = [
    { type: 'text', role: 'assistant', content: 'Which order?' },
    {
      type: 'tool_call',
      role: 'assistant',
      content: 'Checking.',
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
      arguments: { orderId: '123' },
    },
    { type: 'tool_result', role: 'tool', toolUseId: 'toolu_123', result },
    {
      type: 'tool_result',
      role: 'tool',
      toolUseId: 'toolu_123',
      result: {
        type: 'tool_error',
        success: false,
        toolName: 'getOrderStatus',
        arguments: { orderId: '123' },
        attempt: 2,
        durationMs: 5,
        reason: 'TIMEOUT',
        retryable: true,
        message: 'Timed out.',
      },
    },
  ];

  it.each(messages)(
    'round-trips a generated $type message without changing its protocol',
    (message) => {
      const record = toStoredMessage('conversation-1', message);
      expect(toLlmMessage({ ...record, id: 'message-1' } as Message)).toEqual(
        message,
      );
    },
  );

  it('reads a user prompt and legacy assistant text with null tool fields', () => {
    expect(toLlmMessage(stored('Hello', MessageRole.User, null))).toEqual({
      type: 'text',
      role: 'user',
      content: 'Hello',
    });
    expect(
      toLlmMessage(
        stored('Hello', MessageRole.Assistant, {
          toolName: null,
          toolUseId: null,
          arguments: null,
        }),
      ),
    ).toEqual({ type: 'text', role: 'assistant', content: 'Hello' });
  });

  it('reads the existing tool-call and result storage format without a stored discriminator', () => {
    expect(
      toLlmMessage(
        stored('Checking.', MessageRole.Assistant, {
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_123',
          arguments: { orderId: '123' },
        }),
      ),
    ).toEqual(messages[1]);
    expect(
      toLlmMessage(
        stored(JSON.stringify(result), MessageRole.Tool, {
          toolName: 'getOrderStatus',
          toolUseId: 'toolu_123',
        }),
      ),
    ).toEqual(messages[2]);
  });

  it.each([
    stored('Checking.', MessageRole.Assistant, {
      toolName: 'getOrderStatus',
      arguments: {},
    }),
    stored('Checking.', MessageRole.Assistant, {
      toolName: 'getOrderStatus',
      toolUseId: '',
      arguments: {},
    }),
    stored('Checking.', MessageRole.Assistant, {
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
      arguments: [],
    }),
    stored('{}', MessageRole.Tool, null),
    stored('not-json', MessageRole.Tool, {
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
    }),
    stored(JSON.stringify({ ...result, durationMs: -1 }), MessageRole.Tool, {
      toolName: 'getOrderStatus',
      toolUseId: 'toolu_123',
    }),
    stored(JSON.stringify(result), MessageRole.Tool, {
      toolName: 'getOrderItems',
      toolUseId: 'toolu_123',
    }),
  ])(
    'rejects invalid legacy data instead of reconstructing an incomplete tool message (%#)',
    (message) => {
      expect(() => toLlmMessage(message)).toThrow(
        'Invalid persisted message legacy-message',
      );
    },
  );

  it('keeps the stored tool-result payload and metadata compatible', () => {
    expect(toStoredMessage('conversation-1', messages[2])).toEqual({
      conversationId: 'conversation-1',
      role: MessageRole.Tool,
      content: JSON.stringify(result),
      metadata: {
        arguments: result.arguments,
        result,
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_123',
      },
    });
  });
});
