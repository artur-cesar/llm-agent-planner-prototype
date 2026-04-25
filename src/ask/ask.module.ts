import { Module } from '@nestjs/common';

import { ConversationsModule } from '../conversations/conversations.module';
import { LlmModule } from '../llm/llm.module';
import { LlmPlanner } from '../planner/llm-planner';
import { ToolsModule } from '../tools/tools.module';
import { TurnRunnerService } from '../turn/turn-runner.service';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';

@Module({
  imports: [ConversationsModule, LlmModule, ToolsModule],
  controllers: [AskController],
  providers: [AskService, LlmPlanner, TurnRunnerService],
})
export class AskModule {}
