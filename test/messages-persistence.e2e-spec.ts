import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

import type { LlmGateway } from '../src/llm/llm-gateway.interface';

import { AskService } from '../src/ask/ask.service';
import { ConversationsService } from '../src/conversations/conversations.service';
import { Conversation } from '../src/conversations/entities/conversation.entity';
import { Message } from '../src/conversations/entities/message.entity';
import { MessageRole } from '../src/conversations/message-role.enum';
import { MessagesService } from '../src/conversations/messages.service';
import { CreateConversationPersistence20260421191830 } from '../src/database/migrations/20260421191830-CreateConversationPersistence';
import { AddMessageSequence20261113120000 } from '../src/database/migrations/20261113120000-AddMessageSequence';
import { OrderRepository } from '../src/order/order.repository';
import { ToolExecutorService } from '../src/tools/tool-executor.service';
import { ToolRegistry } from '../src/tools/tool-registry';
import { TurnRunnerService } from '../src/turn/turn-runner.service';

const describeDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeDatabase('message persistence (isolated PostgreSQL database)', () => {
  let database: DataSource;
  let service: MessagesService;
  let conversationId: string;

  beforeAll(async () => {
    database = new DataSource({
      type: 'postgres',
      url: process.env.TEST_DATABASE_URL,
      entities: [Conversation, Message],
      migrations: [
        CreateConversationPersistence20260421191830,
        AddMessageSequence20261113120000,
      ],
      synchronize: false,
    });
    await database.initialize();
    await database.runMigrations();
    service = new MessagesService(database.getRepository(Message));
  });

  beforeEach(async () => {
    const conversation = await database
      .getRepository(Conversation)
      .save({ userId: randomUUID() });
    conversationId = conversation.id;
  });

  afterAll(async () => {
    if (database?.isInitialized) await database.destroy();
  });

  it('rolls back a partially written batch while retaining the user prompt', async () => {
    await service.create({
      conversationId,
      role: MessageRole.User,
      content: 'Check order',
    });
    await expect(
      service.createMany([
        { conversationId, role: MessageRole.Assistant, content: 'Tool call' },
        {
          conversationId: randomUUID(),
          role: MessageRole.Tool,
          content: 'Invalid foreign key',
        },
      ]),
    ).rejects.toThrow();
    expect(
      (await service.findByConversationId(conversationId)).map(
        (message) => message.content,
      ),
    ).toEqual(['Check order']);
  });

  it('reloads messages in insertion order even when timestamps tie and UUIDs sort differently', async () => {
    const repository = database.getRepository(Message);
    const createdAt = new Date('2026-01-01T00:00:00Z');
    await repository.save({
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      conversationId,
      createdAt,
      role: MessageRole.User,
      content: 'First',
    });
    await repository.save({
      id: '00000000-0000-4000-8000-000000000000',
      conversationId,
      createdAt,
      role: MessageRole.Assistant,
      content: 'Second',
    });
    await service.createMany([
      { conversationId, role: MessageRole.Assistant, content: 'Tool call' },
      { conversationId, role: MessageRole.Tool, content: 'Tool result' },
      { conversationId, role: MessageRole.Assistant, content: 'Final answer' },
    ]);
    const reloaded = new MessagesService(database.getRepository(Message));
    expect(
      (await reloaded.findByConversationId(conversationId)).map(
        (message) => message.content,
      ),
    ).toEqual(['First', 'Second', 'Tool call', 'Tool result', 'Final answer']);
  });

  it('persists a complete sequential turn and reloads its typed history on a follow-up', async () => {
    const generateAnswer = jest
      .fn<
        ReturnType<LlmGateway['generateAnswer']>,
        Parameters<LlmGateway['generateAnswer']>
      >()
      .mockReturnValueOnce({
        type: 'tool_call',
        toolName: 'getOrderStatus',
        toolUseId: 'toolu_status',
        arguments: { orderId: '123' },
        content: 'Checking status.',
      })
      .mockReturnValueOnce({
        type: 'tool_call',
        toolName: 'getOrderItems',
        toolUseId: 'toolu_items',
        arguments: { orderId: '123' },
        content: 'Checking items.',
      })
      .mockReturnValueOnce({
        type: 'final_answer',
        content: 'PAID; Keyboard, Mouse.',
      })
      .mockReturnValueOnce({
        type: 'final_answer',
        content: 'The same order is PAID.',
      });
    const conversations = new ConversationsService(
      database.getRepository(Conversation),
    );
    const runner = new TurnRunnerService(
      { generateAnswer },
      new ToolExecutorService(new ToolRegistry(new OrderRepository())),
    );
    const ask = new AskService(
      conversations,
      service,
      runner,
      new ToolRegistry(new OrderRepository()),
    );
    const first = await ask.ask(
      { prompt: 'Status and items of order 123' },
      'test-owner',
    );
    expect(first.content).toBe('PAID; Keyboard, Mouse.');
    const stored = await service.findByConversationId(first.conversationId);
    expect(stored.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant',
      'tool',
      'assistant',
    ]);
    expect(stored[1].metadata?.toolUseId).toBe('toolu_status');
    expect(stored[2].metadata?.toolUseId).toBe('toolu_status');
    expect(stored[3].metadata?.toolUseId).toBe('toolu_items');
    expect(stored[4].metadata?.toolUseId).toBe('toolu_items');
    const reloadedAsk = new AskService(
      conversations,
      new MessagesService(database.getRepository(Message)),
      runner,
      new ToolRegistry(new OrderRepository()),
    );
    await reloadedAsk.ask(
      { conversationId: first.conversationId, prompt: 'And its status again?' },
      'test-owner',
    );
    const history = generateAnswer.mock.calls[3][0].messages;
    expect(history).toHaveLength(7);
    expect(history[1]).toMatchObject({
      type: 'tool_call',
      toolUseId: 'toolu_status',
    });
    expect(history[2]).toMatchObject({
      type: 'tool_result',
      toolUseId: 'toolu_status',
    });
    expect(history[3]).toMatchObject({
      type: 'tool_call',
      toolUseId: 'toolu_items',
    });
    expect(history[4]).toMatchObject({
      type: 'tool_result',
      toolUseId: 'toolu_items',
    });
    expect(
      await service.findByConversationId(first.conversationId),
    ).toHaveLength(8);
  });

  it('backfills legacy rows, supports new inserts, and can revert and reapply the migration', async () => {
    await database.undoLastMigration();
    await database.query(
      `INSERT INTO messages (content, role, conversation_id, created_at) VALUES ('Legacy', 'user', $1, '2025-01-01')`,
      [conversationId],
    );
    await database.runMigrations();
    await service.create({
      conversationId,
      role: MessageRole.Assistant,
      content: 'New',
    });
    expect(
      (await service.findByConversationId(conversationId)).map(
        (message) => message.content,
      ),
    ).toEqual(['Legacy', 'New']);
    const rows: Array<{ sequence: string }> = await database.query(
      'SELECT sequence FROM messages',
    );
    expect(new Set(rows.map((row) => row.sequence)).size).toBe(rows.length);
  });
});
