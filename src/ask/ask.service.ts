import { Inject, Injectable } from '@nestjs/common';

import type { LlmGateway } from '../llm/llm-gateway.interface';
import type { AskRequestDto } from './dto/ask-request.dto';
import type { AskResponseDto } from './dto/ask-response.dto';

import { LLM_GATEWAY } from '../llm/llm.constants';

@Injectable()
export class AskService {
  constructor(
    @Inject(LLM_GATEWAY)
    private readonly llmGateway: LlmGateway,
  ) {}

  async ask(input: AskRequestDto): Promise<AskResponseDto> {
    const answer = await this.llmGateway.generateAnswer({
      prompt: input.prompt,
    });

    return {
      content: answer.content,
    };
  }
}
