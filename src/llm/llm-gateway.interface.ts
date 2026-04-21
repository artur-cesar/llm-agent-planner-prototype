export interface GenerateAnswerInput {
  prompt: string;
}

export interface GenerateAnswerOutput {
  content: string;
}

export interface LlmGateway {
  generateAnswer(
    input: GenerateAnswerInput,
  ): GenerateAnswerOutput | Promise<GenerateAnswerOutput>;
}
