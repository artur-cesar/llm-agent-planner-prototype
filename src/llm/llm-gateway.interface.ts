export interface GenerateAnswerInput {
  prompt: string;
}

export interface GenerateAnswerOutput {
  content: string;
}

export interface LlmGateway {
  generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerOutput>;
}
