import { ConflictException, NotFoundException } from '@nestjs/common';

import type { LlmGateway } from '../llm/llm-gateway.interface';

import { ConversationsService } from '../conversations/conversations.service';
import { CreateConversationInput } from '../conversations/dto/create-conversation.input';
import { CreateMessageInput } from '../conversations/dto/create-message.input';
import { Message } from '../conversations/entities/message.entity';
import { MessageRole } from '../conversations/message-role.enum';
import { MessagesService } from '../conversations/messages.service';
import { OrderRepository } from '../order/order.repository';
import { LlmPlanner } from '../planner/llm-planner';
import { ToolExecutorService } from '../tools/tool-executor.service';
import { TurnRunnerService } from '../turn/turn-runner.service';
import { AskService } from './ask.service';
import { ASK_SYSTEM_PROMPT } from './system.prompt';

type StoredConversation = {
  id: string;
  systemPrompt: string | null;
  userId: string;
};

describe('AskService', () => {
  let askService: AskService;
  let conversationsService: jest.Mocked<ConversationsService>;
  let messagesService: jest.Mocked<MessagesService>;
  let storedConversations: StoredConversation[];
  let storedMessages: Message[];
  let messageCounter: number;
  let generateAnswer: jest.MockedFunction<LlmGateway['generateAnswer']>;

  const toolCall = (toolName: string) => ({
    type: 'tool_call' as const,
    arguments: { orderId: '123' },
    content: `Checking ${toolName} for order 123.`,
    toolName,
    toolUseId: `test-tool-use-${toolName}-123`,
  });

  beforeEach(() => {
    storedConversations = [];
    storedMessages = [];
    messageCounter = 0;

    conversationsService = {
      create: jest.fn((input: CreateConversationInput) => {
        const conversation = {
          id: `conversation-${storedConversations.length + 1}`,
          systemPrompt: input.systemPrompt ?? null,
          userId: input.userId,
        };

        storedConversations.push(conversation);

        return Promise.resolve(conversation as never);
      }),
      findByIdAndUserId: jest.fn((id: string, userId: string) => {
        return Promise.resolve(
          (storedConversations.find(
            (conversation) =>
              conversation.id === id && conversation.userId === userId,
          ) ?? null) as never,
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

    messagesService.createMany = jest.fn(
      async (inputs: CreateMessageInput[]) => {
        for (const input of inputs) await messagesService.create(input);
      },
    );

    generateAnswer = jest.fn();
    const llmPlanner = new LlmPlanner({ generateAnswer });
    const turnRunnerService = new TurnRunnerService(
      llmPlanner,
      new ToolExecutorService(new OrderRepository()),
    );

    askService = new AskService(
      conversationsService,
      messagesService,
      turnRunnerService,
    );
  });

  it('should persist a direct answer in a new conversation', async () => {
    generateAnswer.mockReturnValueOnce({
      type: 'final_answer',
      content: 'Hello world.',
    });
    await expect(
      askService.ask({ prompt: 'hello world' }, 'user-123'),
    ).resolves.toEqual({
      content: 'Hello world.',
      conversationId: 'conversation-1',
    });

    expect(conversationsService.create.mock.calls).toEqual([
      [
        {
          systemPrompt: ASK_SYSTEM_PROMPT,
          userId: 'user-123',
        },
      ],
    ]);
    expect(storedMessages.map((message) => message.role)).toEqual([
      MessageRole.User,
      MessageRole.Assistant,
    ]);
    expect(storedMessages.map((message) => message.content)).toEqual([
      'hello world',
      'Hello world.',
    ]);
  });

  it('should execute a tool call and persist the intermediate tool messages', async () => {
    generateAnswer
      .mockReturnValueOnce(toolCall('getOrderStatus'))
      .mockReturnValueOnce({
        type: 'final_answer',
        content: 'Order 123 is currently PAID.',
      });
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
      toolUseId: 'test-tool-use-getOrderStatus-123',
    });
    expect(JSON.parse(storedMessages[2].content)).toMatchObject({
      arguments: { orderId: '123' },
      data: { orderId: '123', status: 'PAID' },
      success: true,
      toolName: 'getOrderStatus',
      type: 'tool_success',
    });
    expect(storedMessages[2].metadata).toMatchObject({
      arguments: { orderId: '123' },
      result: {
        arguments: { orderId: '123' },
        data: { orderId: '123', status: 'PAID' },
        success: true,
        toolName: 'getOrderStatus',
        type: 'tool_success',
      },
      toolName: 'getOrderStatus',
      toolUseId: 'test-tool-use-getOrderStatus-123',
    });
  });

  it('should execute multiple tool calls in the same turn', async () => {
    generateAnswer
      .mockReturnValueOnce(toolCall('getOrderStatus'))
      .mockReturnValueOnce(toolCall('getOrderItems'))
      .mockReturnValueOnce({
        type: 'final_answer',
        content:
          'Order 123 is currently PAID. Order 123 contains: Keyboard, Mouse.',
      });
    await expect(
      askService.ask(
        { prompt: 'What is the status and items of order 123?' },
        'user-123',
      ),
    ).resolves.toEqual({
      content:
        'Order 123 is currently PAID. Order 123 contains: Keyboard, Mouse.',
      conversationId: 'conversation-1',
    });

    expect(storedMessages.map((message) => message.role)).toEqual([
      MessageRole.User,
      MessageRole.Assistant,
      MessageRole.Tool,
      MessageRole.Assistant,
      MessageRole.Tool,
      MessageRole.Assistant,
    ]);
    expect(storedMessages[1].metadata).toEqual({
      arguments: { orderId: '123' },
      toolName: 'getOrderStatus',
      toolUseId: 'test-tool-use-getOrderStatus-123',
    });
    expect(storedMessages[3].metadata).toEqual({
      arguments: { orderId: '123' },
      toolName: 'getOrderItems',
      toolUseId: 'test-tool-use-getOrderItems-123',
    });
    expect(storedMessages[5].content).toBe(
      'Order 123 is currently PAID. Order 123 contains: Keyboard, Mouse.',
    );
  });

  it('should reuse persisted context for clarification-based follow-up turns', async () => {
    generateAnswer
      .mockReturnValueOnce({
        type: 'final_answer',
        content: 'I can help with that. Which order ID should I check for you?',
      })
      .mockReturnValueOnce(toolCall('getOrderStatus'))
      .mockReturnValueOnce({
        type: 'final_answer',
        content: 'Order 123 is currently PAID.',
      });
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

    expect(generateAnswer.mock.calls[1][0].messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: 'What is the status of my order?',
        }),
        expect.objectContaining({
          role: 'assistant',
          content:
            'I can help with that. Which order ID should I check for you?',
        }),
        expect.objectContaining({ role: 'user', content: '123' }),
      ]),
    );
    expect(messagesService.findByConversationId.mock.calls).toContainEqual([
      firstResponse.conversationId,
    ]);
    expect(
      storedMessages.slice(0, 4).map((message) => message.content),
    ).toEqual([
      'What is the status of my order?',
      'I can help with that. Which order ID should I check for you?',
      '123',
      'Checking getOrderStatus for order 123.',
    ]);
    expect(JSON.parse(storedMessages[4].content)).toMatchObject({
      arguments: { orderId: '123' },
      data: { orderId: '123', status: 'PAID' },
      success: true,
      toolName: 'getOrderStatus',
      type: 'tool_success',
    });
    expect(storedMessages[5].content).toBe('Order 123 is currently PAID.');
  });

  it.each([false, true])(
    'should reject overlapping turns and release the guard after failure=%s',
    async (fail) => {
      storedConversations.push({
        id: 'conversation-1',
        userId: 'user-123',
        systemPrompt: null,
      });
      let finish!: () => void;
      let started!: () => void;
      const entered = new Promise<void>((resolve) => {
        started = resolve;
      });
      generateAnswer
        .mockImplementationOnce(async () => {
          started();
          await new Promise<void>((resolve) => {
            finish = resolve;
          });
          if (fail) throw new Error('LLM unavailable');
          return { type: 'final_answer', content: 'Done.' };
        })
        .mockReturnValue({ type: 'final_answer', content: 'Next.' });
      const input = {
        conversationId: 'conversation-1',
        prompt: 'First prompt',
      };
      const first = askService.ask(input, 'user-123');
      const outcome = fail
        ? expect(first).rejects.toThrow('LLM unavailable')
        : expect(first).resolves.toMatchObject({ content: 'Done.' });
      await entered;
      await expect(
        askService.ask({ ...input, prompt: 'Rejected prompt' }, 'user-123'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(storedMessages.map((message) => message.content)).toEqual([
        'First prompt',
      ]);
      finish();
      await outcome;
      await expect(
        askService.ask({ ...input, prompt: 'Next prompt' }, 'user-123'),
      ).resolves.toMatchObject({ content: 'Next.' });
    },
  );

  it('should keep the prompt and release the guard when batch persistence fails', async () => {
    generateAnswer.mockReturnValue({ type: 'final_answer', content: 'Done.' });
    messagesService.createMany.mockRejectedValueOnce(
      new Error('Database unavailable'),
    );
    await expect(
      askService.ask({ prompt: 'First prompt' }, 'user-123'),
    ).rejects.toThrow('Database unavailable');
    expect(storedMessages.map((message) => message.role)).toEqual([
      MessageRole.User,
    ]);
    await expect(
      askService.ask(
        { conversationId: 'conversation-1', prompt: 'Next prompt' },
        'user-123',
      ),
    ).resolves.toMatchObject({ content: 'Done.' });
  });

  it('should reject another user before reading or writing messages', async () => {
    storedConversations.push({
      id: 'private-conversation',
      userId: 'user-A',
      systemPrompt: null,
    });

    await expect(
      askService.ask(
        { conversationId: 'private-conversation', prompt: 'hello world' },
        'user-B',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(conversationsService.findByIdAndUserId.mock.calls.at(-1)).toEqual([
      'private-conversation',
      'user-B',
    ]);
    expect(messagesService.create.mock.calls).toHaveLength(0);
    expect(messagesService.findByConversationId.mock.calls).toHaveLength(0);
    expect(generateAnswer).not.toHaveBeenCalled();
  });

  it('should normalize the owner when creating and continuing a conversation', async () => {
    generateAnswer.mockReturnValue({ type: 'final_answer', content: 'Hello.' });
    const first = await askService.ask({ prompt: 'hello world' }, ' user-123 ');
    await askService.ask(
      { conversationId: first.conversationId, prompt: 'hello again' },
      ' user-123 ',
    );

    expect(storedConversations[0].userId).toBe('user-123');
    expect(conversationsService.findByIdAndUserId.mock.calls.at(-1)).toEqual([
      first.conversationId,
      'user-123',
    ]);
  });

  it('should preserve anonymous conversation continuity', async () => {
    generateAnswer.mockReturnValue({ type: 'final_answer', content: 'Hello.' });
    const first = await askService.ask({ prompt: 'hello world' });
    await askService.ask(
      { conversationId: first.conversationId, prompt: 'hello again' },
      '   ',
    );

    expect(storedConversations[0].userId).toBe('anonymous-user');
    expect(conversationsService.findByIdAndUserId.mock.calls.at(-1)).toEqual([
      first.conversationId,
      'anonymous-user',
    ]);
  });

  it('should fail when the conversation does not exist', async () => {
    await expect(
      askService.ask({
        conversationId: 'missing-conversation',
        prompt: 'hello world',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(messagesService.create.mock.calls).toHaveLength(0);
    expect(messagesService.findByConversationId.mock.calls).toHaveLength(0);
  });
});
