import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AskModule } from './ask/ask.module';
import { ConversationsModule } from './conversations/conversations.module';
import { createDatabaseConfig } from './database/database.config';
import { LlmModule } from './llm/llm.module';
import { ToolsModule } from './tools/tools.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(createDatabaseConfig()),
    AskModule,
    ConversationsModule,
    LlmModule,
    ToolsModule,
  ],
})
export class AppModule {}
