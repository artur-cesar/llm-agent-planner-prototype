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
    const requestedToolNames = this.resolveRequestedToolNames(input.messages);

    if (lastMessage?.role === 'tool') {
      const remainingToolName = this.findNextToolToExecute(
        requestedToolNames,
        input.messages,
      );

      if (remainingToolName !== null) {
        const orderId = this.readString(
          this.parseToolResult(lastMessage.content).orderId,
        );

        if (orderId !== null) {
          return {
            arguments: { orderId },
            content: `Checking ${remainingToolName} for order ${orderId}.`,
            toolName: remainingToolName,
            toolUseId: `fake-tool-use-${remainingToolName}-${orderId}`,
            type: 'tool_call',
          };
        }
      }

      return this.answerFromToolResults(input.messages, requestedToolNames);
    }

    const lastUserMessage = this.findLastUserMessage(input.messages);

    if (lastUserMessage === undefined) {
      return {
        content: 'Fake LLM response: ',
        type: 'final_answer',
      };
    }

    const requestedToolName = requestedToolNames[0] ?? null;
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

  private answerFromToolResults(
    messages: LlmMessage[],
    requestedToolNames: string[],
  ): GenerateAnswerOutput {
    const toolResults = this.collectToolResults(messages);
    const normalizedRequestedToolNames =
      requestedToolNames.length > 0
        ? requestedToolNames
        : [...toolResults.keys()];
    const orderId =
      this.readString(toolResults.get('getOrderStatus')?.orderId) ??
      this.readString(toolResults.get('getOrderItems')?.orderId) ??
      'unknown';

    const contentParts: string[] = [];

    if (normalizedRequestedToolNames.includes('getOrderStatus')) {
      const status =
        this.readString(toolResults.get('getOrderStatus')?.status) ?? 'UNKNOWN';

      contentParts.push(`Order ${orderId} is currently ${status}.`);
    }

    if (normalizedRequestedToolNames.includes('getOrderItems')) {
      const itemsValue = toolResults.get('getOrderItems')?.items;
      const items =
        Array.isArray(itemsValue) &&
        itemsValue.every((item) => typeof item === 'string')
          ? itemsValue
          : [];

      contentParts.push(
        items.length > 0
          ? `Order ${orderId} contains: ${items.join(', ')}.`
          : `I could not find any items for order ${orderId}.`,
      );
    }

    if (contentParts.length === 0) {
      return {
        content: 'Fake LLM response: ',
        type: 'final_answer',
      };
    }

    return {
      content: contentParts.join(' '),
      type: 'final_answer',
    };
  }

  private collectToolResults(
    messages: LlmMessage[],
  ): Map<string, Record<string, unknown>> {
    const toolResults = new Map<string, Record<string, unknown>>();

    for (const message of messages) {
      if (
        message.role !== 'tool' ||
        message.toolName === undefined ||
        message.toolName === null
      ) {
        continue;
      }

      toolResults.set(message.toolName, this.parseToolResult(message.content));
    }

    return toolResults;
  }

  private findNextToolToExecute(
    requestedToolNames: string[],
    messages: LlmMessage[],
  ): string | null {
    const executedToolNames = new Set(
      messages
        .filter(
          (message) =>
            message.role === 'tool' &&
            message.toolName !== undefined &&
            message.toolName !== null,
        )
        .map((message) => message.toolName as string),
    );

    return (
      requestedToolNames.find((toolName) => !executedToolNames.has(toolName)) ??
      null
    );
  }

  private resolveRequestedToolNames(messages: LlmMessage[]): string[] {
    const latestUserMessage = this.findLastUserMessage(messages);

    if (latestUserMessage === undefined) {
      return [];
    }

    const directTools = this.detectToolNames(latestUserMessage.content);

    if (directTools.length > 0) {
      return directTools;
    }

    if (this.extractOrderId(latestUserMessage.content) === null) {
      return [];
    }

    const previousAssistantMessage = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === 'assistant' &&
          message.content.toLowerCase().includes('which order id'),
      );

    if (previousAssistantMessage === undefined) {
      return [];
    }

    const assistantIndex = messages.indexOf(previousAssistantMessage);

    for (let index = assistantIndex - 1; index >= 0; index -= 1) {
      const message = messages[index];

      if (message.role !== 'user') {
        continue;
      }

      const inferredTools = this.detectToolNames(message.content);

      if (inferredTools.length > 0) {
        return inferredTools;
      }
    }

    return [];
  }

  private detectToolNames(content: string): string[] {
    const normalizedContent = content.toLowerCase();
    const toolNames: string[] = [];

    if (
      normalizedContent.includes('status') ||
      normalizedContent.includes('situa') ||
      normalizedContent.includes('estado')
    ) {
      toolNames.push('getOrderStatus');
    }

    if (
      normalizedContent.includes('item') ||
      normalizedContent.includes('product') ||
      normalizedContent.includes('produto')
    ) {
      toolNames.push('getOrderItems');
    }

    return toolNames;
  }
}
