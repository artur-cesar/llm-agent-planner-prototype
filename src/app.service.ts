import { Inject, Injectable } from '@nestjs/common';

import type { AskRequestDto } from './ask/dto/ask-request.dto';
import type { AskResponseDto } from './ask/dto/ask-response.dto';
import type { LlmGateway } from './llm/llm-gateway.interface';

import { LLM_GATEWAY } from './llm/llm.constants';

@Injectable()
export class AppService {
  constructor(
    @Inject(LLM_GATEWAY)
    private readonly llmGateway: LlmGateway,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async ask(input: AskRequestDto): Promise<AskResponseDto> {
    const answer = await this.llmGateway.generateAnswer({
      prompt: input.prompt,
    });

    return {
      content: answer.content,
    };
  }
}
