import { Module } from '@nestjs/common';

import { ConversationsModule } from '../conversations/conversations.module';
import { LlmModule } from '../llm/llm.module';
import { ToolsModule } from '../tools/tools.module';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';

@Module({
  imports: [ConversationsModule, LlmModule, ToolsModule],
  controllers: [AskController],
  providers: [AskService],
})
export class AskModule {}
