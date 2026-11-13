import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

import { Conversation } from '../src/conversations/entities/conversation.entity';
import { Message } from '../src/conversations/entities/message.entity';
import { MessageRole } from '../src/conversations/message-role.enum';
import { MessagesService } from '../src/conversations/messages.service';
import { CreateConversationPersistence20260421191830 } from '../src/database/migrations/20260421191830-CreateConversationPersistence';
import { AddMessageSequence20261113120000 } from '../src/database/migrations/20261113120000-AddMessageSequence';

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
