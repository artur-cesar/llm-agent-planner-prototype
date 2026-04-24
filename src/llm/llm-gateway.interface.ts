import type { ToolDefinition } from '../tools/tool-definition.interface';

export type LlmMessageRole = 'assistant' | 'tool' | 'user';

export interface LlmMessage {
  arguments?: Record<string, unknown> | null;
  content: string;
  role: LlmMessageRole;
  toolName?: string | null;
  toolUseId?: string | null;
}

export interface GenerateAnswerInput {
  messages: LlmMessage[];
  system?: string;
  tools: ToolDefinition[];
}

export interface GenerateAnswerFinalResponse {
  content: string;
  type: 'final_answer';
}

export interface GenerateAnswerToolCallResponse {
  arguments: Record<string, unknown>;
  content: string;
  toolName: string;
  toolUseId: string | null;
  type: 'tool_call';
}

export type GenerateAnswerOutput =
  | GenerateAnswerFinalResponse
  | GenerateAnswerToolCallResponse;

export interface LlmGateway {
  generateAnswer(
    input: GenerateAnswerInput,
  ): GenerateAnswerOutput | Promise<GenerateAnswerOutput>;
}
