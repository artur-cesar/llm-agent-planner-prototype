import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AskController } from './ask/ask.controller';
import { AskService } from './ask/ask.service';
import { ConversationsModule } from './conversations/conversations.module';
import { Conversation } from './conversations/entities/conversation.entity';
import { Message } from './conversations/entities/message.entity';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT ?? 5432),
      username: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      database: process.env.DATABASE_NAME ?? 'llm_agent_planner',
      entities: [Conversation, Message],
      synchronize: false,
    }),
    ConversationsModule,
    LlmModule,
  ],
  controllers: [AppController, AskController],
  providers: [AppService, AskService],
})
export class AppModule {}
