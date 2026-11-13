import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AskRequestDto } from './dto/ask-request.dto';
import type { AskResponseDto } from './dto/ask-response.dto';

import { ConversationsService } from '../conversations/conversations.service';
import { MessageRole } from '../conversations/message-role.enum';
import { toLlmMessage, toStoredMessage } from '../conversations/message.mapper';
import { MessagesService } from '../conversations/messages.service';
import { toolDefinitions } from '../tools/tool-definitions';
import { TurnRunnerService } from '../turn/turn-runner.service';
import { ASK_SYSTEM_PROMPT } from './system.prompt';

const DEFAULT_USER_ID = 'anonymous-user';

@Injectable()
export class AskService {
  private readonly activeConversations = new Set<string>();

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly turnRunnerService: TurnRunnerService,
  ) {}

  async ask(input: AskRequestDto, userId?: string): Promise<AskResponseDto> {
    if (input?.prompt === undefined) {
      throw new BadRequestException('prompt is required.');
    }

    /**
     * find a conversation or create, failing if nothing was found for the
     * given conversationId
     */
    const conversation = await this.resolveConversation(
      input.conversationId,
      userId?.trim() || DEFAULT_USER_ID,
    );
    if (this.activeConversations.has(conversation.id)) {
      throw new ConflictException(
        'A turn is already running for this conversation.',
      );
    }
    this.activeConversations.add(conversation.id);

    try {
      /**
       * Create the new prompt
       */
      await this.messagesService.create({
        content: input.prompt,
        conversationId: conversation.id,
        role: MessageRole.User,
      });

      /**
       * Consolidate the conversation with all messages
       */
      const messageHistory = await this.messagesService.findByConversationId(
        conversation.id,
      );

      const turnResult = await this.turnRunnerService.run({
        messages: messageHistory.map(toLlmMessage),
        systemPrompt: conversation.systemPrompt ?? ASK_SYSTEM_PROMPT,
        tools: toolDefinitions,
      });
      await this.messagesService.createMany(
        turnResult.generatedMessages.map((message) =>
          toStoredMessage(conversation.id, message),
        ),
      );

      return {
        content: turnResult.content,
        conversationId: conversation.id,
      };
    } finally {
      this.activeConversations.delete(conversation.id);
    }
  }

  private async resolveConversation(
    conversationId: string | undefined,
    userId: string,
  ) {
    if (conversationId !== undefined) {
      const conversation = await this.conversationsService.findByIdAndUserId(
        conversationId,
        userId,
      );

      if (conversation === null) {
        throw new NotFoundException(
          `Conversation ${conversationId} was not found.`,
        );
      }

      return conversation;
    }

    return this.conversationsService.create({
      systemPrompt: ASK_SYSTEM_PROMPT,
      userId,
    });
  }
}
