import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  GenerateAnswerOutput,
  LlmGateway,
  LlmMessage,
} from '../llm/llm-gateway.interface';
import type { AskRequestDto } from './dto/ask-request.dto';
import type { AskResponseDto } from './dto/ask-response.dto';

import { ConversationsService } from '../conversations/conversations.service';
import { Message } from '../conversations/entities/message.entity';
import { MessageRole } from '../conversations/message-role.enum';
import { MessagesService } from '../conversations/messages.service';
import { LLM_GATEWAY } from '../llm/llm.constants';
import { toolDefinitions } from '../tools/tool-definitions';
import { ToolExecutorService } from '../tools/tool-executor.service';

const DEFAULT_USER_ID = 'anonymous-user';

@Injectable()
export class AskService {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly toolExecutorService: ToolExecutorService,
    @Inject(LLM_GATEWAY)
    private readonly llmGateway: LlmGateway,
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

    const answer = await this.llmGateway.generateAnswer({
      messages: this.mapMessagesForLlm(messageHistory),
      tools: toolDefinitions,
    });

    /**
     * Decides what to do with the llm answer:
     * Returns final answer or execute tools.
     */
    const finalAnswer = await this.resolveAnswer(answer, conversation.id);

    return {
      content: finalAnswer.content,
      conversationId: conversation.id,
    };
  }

  private async resolveAnswer(
    answer: GenerateAnswerOutput,
    conversationId: string,
  ): Promise<{ content: string }> {
    if (answer.type === 'final_answer') {
      await this.messagesService.create({
        content: answer.content,
        conversationId,
        role: MessageRole.Assistant,
      });

      return {
        content: answer.content,
      };
    }

    await this.messagesService.create({
      content: answer.content,
      conversationId,
      metadata: {
        arguments: answer.arguments,
        toolName: answer.toolName,
        toolUseId: answer.toolUseId,
      },
      role: MessageRole.Assistant,
    });

    const executionResult = this.toolExecutorService.execute(
      answer.toolName,
      answer.arguments,
    );

    await this.messagesService.create({
      content: JSON.stringify(executionResult.result),
      conversationId,
      metadata: {
        result: executionResult.result,
        toolName: executionResult.toolName,
        toolUseId: answer.toolUseId,
      },
      role: MessageRole.Tool,
    });

    const updatedMessageHistory =
      await this.messagesService.findByConversationId(conversationId);
    const followUpAnswer = await this.llmGateway.generateAnswer({
      messages: this.mapMessagesForLlm(updatedMessageHistory),
      tools: toolDefinitions,
    });

    if (followUpAnswer.type !== 'final_answer') {
      throw new BadRequestException(
        `LLM returned an unsupported follow-up tool call for ${followUpAnswer.toolName}.`,
      );
    }

    await this.messagesService.create({
      content: followUpAnswer.content,
      conversationId,
      role: MessageRole.Assistant,
    });

    return {
      content: followUpAnswer.content,
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
      userId: userId?.trim() || DEFAULT_USER_ID,
    });
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
