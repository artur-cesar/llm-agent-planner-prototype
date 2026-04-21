import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConversationsService } from './conversations.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { MessagesService } from './messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  providers: [ConversationsService, MessagesService],
  exports: [ConversationsService, MessagesService],
})
export class ConversationsModule {}
