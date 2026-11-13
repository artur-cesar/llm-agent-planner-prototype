import type {
  GeneratedMessage,
  LlmMessage,
} from '../llm/llm-gateway.interface';
import type { ToolExecutionResult } from '../tools/tool-definition.interface';
import type { CreateMessageInput } from './dto/create-message.input';
import type { Message } from './entities/message.entity';

import { MessageRole } from './message-role.enum';

export function toStoredMessage(
  conversationId: string,
  message: GeneratedMessage,
): CreateMessageInput {
  if (message.type === 'tool_call') {
    return {
      conversationId,
      content: message.content,
      role: MessageRole.Assistant,
      metadata: {
        arguments: message.arguments,
        toolName: message.toolName,
        toolUseId: message.toolUseId,
      },
    };
  }
  if (message.type === 'tool_result') {
    return {
      conversationId,
      content: JSON.stringify(message.result),
      role: MessageRole.Tool,
      metadata: {
        arguments: message.result.arguments,
        result: message.result,
        toolName: message.result.toolName,
        toolUseId: message.toolUseId,
      },
    };
  }
  return {
    conversationId,
    content: message.content,
    role: MessageRole.Assistant,
    metadata: null,
  };
}

export function toLlmMessage(message: Message): LlmMessage {
  const invalid = () =>
    new Error(
      `Invalid persisted message ${message.id}: malformed message or tool metadata.`,
    );
  if (typeof message.content !== 'string') throw invalid();
  if (message.role === MessageRole.User)
    return { type: 'text', role: 'user', content: message.content };
  const metadata = message.metadata ?? {};
  if (!isRecord(metadata)) throw invalid();
  if (message.role === MessageRole.Assistant) {
    const hasToolFields = ['toolName', 'toolUseId', 'arguments'].some(
      (field) => metadata[field] != null,
    );
    if (!hasToolFields)
      return { type: 'text', role: 'assistant', content: message.content };
    if (
      !isNonEmptyString(metadata.toolName) ||
      !isNonEmptyString(metadata.toolUseId) ||
      !isRecord(metadata.arguments)
    )
      throw invalid();
    return {
      type: 'tool_call',
      role: 'assistant',
      content: message.content,
      toolName: metadata.toolName,
      toolUseId: metadata.toolUseId,
      arguments: metadata.arguments,
    };
  }
  if (message.role === MessageRole.Tool) {
    if (
      !isNonEmptyString(metadata.toolUseId) ||
      !isNonEmptyString(metadata.toolName)
    )
      throw invalid();
    let result: unknown;
    try {
      result = JSON.parse(message.content);
    } catch {
      throw invalid();
    }
    if (!isToolResult(result) || result.toolName !== metadata.toolName)
      throw invalid();
    return {
      type: 'tool_result',
      role: 'tool',
      toolUseId: metadata.toolUseId,
      result,
    };
  }
  throw invalid();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isToolResult(value: unknown): value is ToolExecutionResult {
  if (
    !isRecord(value) ||
    !isRecord(value.arguments) ||
    !isNonEmptyString(value.toolName) ||
    typeof value.attempt !== 'number' ||
    !Number.isInteger(value.attempt) ||
    value.attempt < 1 ||
    typeof value.durationMs !== 'number' ||
    !Number.isFinite(value.durationMs) ||
    value.durationMs < 0
  )
    return false;
  if (value.type === 'tool_success')
    return value.success === true && isRecord(value.data);
  return (
    value.type === 'tool_error' &&
    value.success === false &&
    typeof value.message === 'string' &&
    typeof value.retryable === 'boolean' &&
    [
      'EXECUTION_ERROR',
      'INVALID_ARGUMENTS',
      'TIMEOUT',
      'TOOL_NOT_FOUND',
    ].includes(String(value.reason))
  );
}
