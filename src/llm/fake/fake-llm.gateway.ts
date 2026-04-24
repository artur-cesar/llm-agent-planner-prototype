import { Injectable } from '@nestjs/common';

import {
  GenerateAnswerInput,
  GenerateAnswerOutput,
  LlmMessage,
  LlmGateway,
} from '../llm-gateway.interface';

@Injectable()
export class FakeLlmGateway implements LlmGateway {
  generateAnswer(input: GenerateAnswerInput): GenerateAnswerOutput {
    const lastMessage = input.messages.at(-1);

    if (lastMessage?.role === 'tool') {
      return this.answerFromToolResult(lastMessage);
    }

    const lastUserMessage = this.findLastUserMessage(input.messages);

    if (lastUserMessage === undefined) {
      return {
        content: 'Fake LLM response: ',
        type: 'final_answer',
      };
    }

    const requestedToolName = this.resolveRequestedToolName(input.messages);
    const orderId = this.extractOrderId(lastUserMessage.content);

    if (requestedToolName !== null && orderId === null) {
      return {
        content: 'I can help with that. Which order ID should I check for you?',
        type: 'final_answer',
      };
    }

    if (requestedToolName !== null && orderId !== null) {
      return {
        arguments: { orderId },
        content: `Checking ${requestedToolName} for order ${orderId}.`,
        toolName: requestedToolName,
        toolUseId: `fake-tool-use-${requestedToolName}-${orderId}`,
        type: 'tool_call',
      };
    }

    return {
      content: `Fake LLM response: ${lastUserMessage.content}`,
      type: 'final_answer',
    };
  }

  private answerFromToolResult(message: LlmMessage): GenerateAnswerOutput {
    const result = this.parseToolResult(message.content);

    if (message.toolName === 'getOrderStatus') {
      const orderId = this.readString(result.orderId) ?? 'unknown';
      const status = this.readString(result.status) ?? 'UNKNOWN';

      return {
        content: `Order ${orderId} is currently ${status}.`,
        type: 'final_answer',
      };
    }

    if (message.toolName === 'getOrderItems') {
      const orderId = this.readString(result.orderId) ?? 'unknown';
      const items = Array.isArray(result.items)
        ? result.items.filter(
            (item): item is string => typeof item === 'string',
          )
        : [];

      return {
        content:
          items.length > 0
            ? `Order ${orderId} contains: ${items.join(', ')}.`
            : `I could not find any items for order ${orderId}.`,
        type: 'final_answer',
      };
    }

    return {
      content: `Fake LLM response: ${message.content}`,
      type: 'final_answer',
    };
  }

  private extractOrderId(content: string): string | null {
    const match = content.match(/\b\d+\b/);

    return match?.[0] ?? null;
  }

  private findLastUserMessage(messages: LlmMessage[]): LlmMessage | undefined {
    return [...messages].reverse().find((message) => message.role === 'user');
  }

  private parseToolResult(content: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(content);

      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }

    return {};
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
  }

  private resolveRequestedToolName(messages: LlmMessage[]): string | null {
    const latestUserMessage = this.findLastUserMessage(messages);

    if (latestUserMessage === undefined) {
      return null;
    }

    const directTool = this.detectToolName(latestUserMessage.content);

    if (directTool !== null) {
      return directTool;
    }

    if (this.extractOrderId(latestUserMessage.content) === null) {
      return null;
    }

    const previousAssistantMessage = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === 'assistant' &&
          message.content.toLowerCase().includes('which order id'),
      );

    if (previousAssistantMessage === undefined) {
      return null;
    }

    const assistantIndex = messages.indexOf(previousAssistantMessage);

    for (let index = assistantIndex - 1; index >= 0; index -= 1) {
      const message = messages[index];

      if (message.role !== 'user') {
        continue;
      }

      const inferredTool = this.detectToolName(message.content);

      if (inferredTool !== null) {
        return inferredTool;
      }
    }

    return null;
  }

  private detectToolName(content: string): string | null {
    const normalizedContent = content.toLowerCase();

    if (
      normalizedContent.includes('status') ||
      normalizedContent.includes('situa') ||
      normalizedContent.includes('estado')
    ) {
      return 'getOrderStatus';
    }

    if (
      normalizedContent.includes('item') ||
      normalizedContent.includes('product') ||
      normalizedContent.includes('produto')
    ) {
      return 'getOrderItems';
    }

    return null;
  }
}
