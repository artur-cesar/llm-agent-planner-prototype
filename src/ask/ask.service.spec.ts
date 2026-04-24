import { NotFoundException } from '@nestjs/common';

import { ConversationsService } from '../conversations/conversations.service';
import { CreateConversationInput } from '../conversations/dto/create-conversation.input';
import { CreateMessageInput } from '../conversations/dto/create-message.input';
import { Message } from '../conversations/entities/message.entity';
import { MessageRole } from '../conversations/message-role.enum';
import { MessagesService } from '../conversations/messages.service';
import { FakeLlmGateway } from '../llm/fake/fake-llm.gateway';
import { OrderRepository } from '../order/order.repository';
import { ToolExecutorService } from '../tools/tool-executor.service';
import { AskService } from './ask.service';

type StoredConversation = {
  id: string;
  userId: string;
};

describe('AskService', () => {
  let askService: AskService;
  let conversationsService: jest.Mocked<ConversationsService>;
  let messagesService: jest.Mocked<MessagesService>;
  let storedConversations: StoredConversation[];
  let storedMessages: Message[];
  let messageCounter: number;

  beforeEach(() => {
    storedConversations = [];
    storedMessages = [];
    messageCounter = 0;

    conversationsService = {
      create: jest.fn((input: CreateConversationInput) => {
        const conversation = {
          id: `conversation-${storedConversations.length + 1}`,
          userId: input.userId,
        };

        storedConversations.push(conversation);

        return Promise.resolve(conversation as never);
      }),
      findById: jest.fn((id: string) => {
        return Promise.resolve(
          (storedConversations.find((conversation) => conversation.id === id) ??
            null) as never,
        );
      }),
    } as unknown as jest.Mocked<ConversationsService>;

    messagesService = {
      create: jest.fn((input: CreateMessageInput) => {
        messageCounter += 1;

        const message = {
          ...input,
          createdAt: new Date(messageCounter),
          id: `message-${messageCounter}`,
          metadata: input.metadata ?? null,
        } as Message;

        storedMessages.push(message);

        return Promise.resolve(message);
      }),
      findByConversationId: jest.fn((conversationId: string) => {
        return Promise.resolve(
          storedMessages
            .filter((message) => message.conversationId === conversationId)
            .sort((left, right) => {
              const timeDifference =
                left.createdAt.getTime() - right.createdAt.getTime();

              if (timeDifference !== 0) {
                return timeDifference;
              }

              return left.id.localeCompare(right.id);
            }),
        );
      }),
    } as unknown as jest.Mocked<MessagesService>;

    askService = new AskService(
      conversationsService,
      messagesService,
      new ToolExecutorService(new OrderRepository()),
      new FakeLlmGateway(),
    );
  });

  it('should persist a direct answer in a new conversation', async () => {
    await expect(
      askService.ask({ prompt: 'hello world' }, 'user-123'),
    ).resolves.toEqual({
      content: 'Fake LLM response: hello world',
      conversationId: 'conversation-1',
    });

    expect(conversationsService.create.mock.calls).toEqual([
      [{ userId: 'user-123' }],
    ]);
    expect(storedMessages.map((message) => message.role)).toEqual([
      MessageRole.User,
      MessageRole.Assistant,
    ]);
    expect(storedMessages.map((message) => message.content)).toEqual([
      'hello world',
      'Fake LLM response: hello world',
    ]);
  });

  it('should execute a tool call and persist the intermediate tool messages', async () => {
    await expect(
      askService.ask(
        { prompt: 'What is the status of order 123?' },
        'user-123',
      ),
    ).resolves.toEqual({
      content: 'Order 123 is currently PAID.',
      conversationId: 'conversation-1',
    });

    expect(storedMessages.map((message) => message.role)).toEqual([
      MessageRole.User,
      MessageRole.Assistant,
      MessageRole.Tool,
      MessageRole.Assistant,
    ]);
    expect(storedMessages[1].metadata).toEqual({
      arguments: { orderId: '123' },
      toolName: 'getOrderStatus',
      toolUseId: 'fake-tool-use-getOrderStatus-123',
    });
    expect(storedMessages[2].content).toBe('{"orderId":"123","status":"PAID"}');
    expect(storedMessages[2].metadata).toEqual({
      result: { orderId: '123', status: 'PAID' },
      toolName: 'getOrderStatus',
      toolUseId: 'fake-tool-use-getOrderStatus-123',
    });
  });

  it('should reuse persisted context for clarification-based follow-up turns', async () => {
    const firstResponse = await askService.ask(
      { prompt: 'What is the status of my order?' },
      'user-123',
    );

    await expect(
      askService.ask(
        {
          conversationId: firstResponse.conversationId,
          prompt: '123',
        },
        'user-123',
      ),
    ).resolves.toEqual({
      content: 'Order 123 is currently PAID.',
      conversationId: firstResponse.conversationId,
    });

    expect(messagesService.findByConversationId.mock.calls).toContainEqual([
      firstResponse.conversationId,
    ]);
    expect(storedMessages.map((message) => message.content)).toEqual([
      'What is the status of my order?',
      'I can help with that. Which order ID should I check for you?',
      '123',
      'Checking getOrderStatus for order 123.',
      '{"orderId":"123","status":"PAID"}',
      'Order 123 is currently PAID.',
    ]);
  });

  it('should fail when the conversation does not exist', async () => {
    await expect(
      askService.ask({
        conversationId: 'missing-conversation',
        prompt: 'hello world',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
