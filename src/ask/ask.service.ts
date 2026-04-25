import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { LlmMessage } from '../llm/llm-gateway.interface';
import type { AskRequestDto } from './dto/ask-request.dto';
import type { AskResponseDto } from './dto/ask-response.dto';

import { ConversationsService } from '../conversations/conversations.service';
import { Message } from '../conversations/entities/message.entity';
import { MessageRole } from '../conversations/message-role.enum';
import { MessagesService } from '../conversations/messages.service';
import { toolDefinitions } from '../tools/tool-definitions';
import {
  TurnRunnerGeneratedMessage,
  TurnRunnerService,
} from '../turn/turn-runner.service';
import { ASK_SYSTEM_PROMPT } from './system.prompt';

const DEFAULT_USER_ID = 'anonymous-user';

@Injectable()
export class AskService {
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
      userId,
    );
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
      messages: this.mapMessagesForLlm(messageHistory),
      systemPrompt: conversation.systemPrompt ?? ASK_SYSTEM_PROMPT,
      tools: toolDefinitions,
    });
    await this.persistGeneratedMessages(
      conversation.id,
      turnResult.generatedMessages,
    );

    return {
      content: turnResult.content,
      conversationId: conversation.id,
    };
  }

  private mapMessagesForLlm(messages: Message[]): LlmMessage[] {
    return messages.map((message) => {
      const metadata = this.readMetadata(message.metadata);
      const toolName = this.readString(metadata.toolName);
      const toolUseId = this.readString(metadata.toolUseId);

      return {
        arguments: this.readArguments(metadata.arguments),
        content: message.content,
        role: message.role,
        toolName,
        toolUseId,
      };
    });
  }

  private async resolveConversation(
    conversationId: string | undefined,
    userId: string | undefined,
  ) {
    if (conversationId !== undefined) {
      const conversation =
        await this.conversationsService.findById(conversationId);

      if (conversation === null) {
        throw new NotFoundException(
          `Conversation ${conversationId} was not found.`,
        );
      }

      return conversation;
    }

    return this.conversationsService.create({
      systemPrompt: ASK_SYSTEM_PROMPT,
      userId: userId?.trim() || DEFAULT_USER_ID,
    });
  }

  private async persistGeneratedMessages(
    conversationId: string,
    messages: TurnRunnerGeneratedMessage[],
  ): Promise<void> {
    for (const message of messages) {
      await this.messagesService.create({
        content: message.content,
        conversationId,
        metadata: message.metadata ?? null,
        role: this.mapRole(message.role),
      });
    }
  }

  private mapRole(role: LlmMessage['role']): MessageRole {
    switch (role) {
      case 'assistant':
        return MessageRole.Assistant;
      case 'tool':
        return MessageRole.Tool;
      case 'user':
        return MessageRole.User;
    }
  }

  private readArguments(
    value: unknown,
  ): Record<string, unknown> | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private readMetadata(value: unknown): Record<string, unknown> {
    if (value === null || value === undefined) {
      return {};
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private readString(value: unknown): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    return value;
  }
}
