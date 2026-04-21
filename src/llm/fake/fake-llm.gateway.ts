import { Injectable } from '@nestjs/common';

import {
  GenerateAnswerInput,
  GenerateAnswerOutput,
  LlmGateway,
} from '../llm-gateway.interface';

@Injectable()
export class FakeLlmGateway implements LlmGateway {
  generateAnswer(input: GenerateAnswerInput): GenerateAnswerOutput {
    return {
      content: `Fake LLM response: ${input.prompt}`,
    };
  }
}
