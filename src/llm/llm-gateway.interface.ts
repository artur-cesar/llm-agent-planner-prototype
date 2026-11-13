import type {
  ToolDefinition,
  ToolExecutionResult,
} from '../tools/tool-definition.interface';

export interface UserMessage {
  type: 'text';
  role: 'user';
  content: string;
}

export interface AssistantMessage {
  type: 'text';
  role: 'assistant';
  content: string;
}

export interface ToolCallMessage {
  type: 'tool_call';
  role: 'assistant';
  content: string;
  arguments: Record<string, unknown>;
  toolName: string;
  toolUseId: string;
}

export interface ToolResultMessage {
  type: 'tool_result';
  role: 'tool';
  toolUseId: string;
  result: ToolExecutionResult;
}

export type LlmMessage =
  | UserMessage
  | AssistantMessage
  | ToolCallMessage
  | ToolResultMessage;
export type GeneratedMessage = Exclude<LlmMessage, UserMessage>;

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
  toolUseId: string;
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
