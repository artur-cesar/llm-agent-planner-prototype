export interface GenerateAnswerInput {
  prompt: string;
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
