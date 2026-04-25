import type { DataSourceOptions } from 'typeorm';

import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';

export function createDatabaseConfig(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    database: process.env.DATABASE_NAME ?? 'llm_agent_planner',
    entities: [Conversation, Message],
    synchronize: false,
  };
}

export function createDataSourceConfig(): DataSourceOptions {
  return {
    ...createDatabaseConfig(),
    migrations: ['dist/database/migrations/*.js'],
  };
}
