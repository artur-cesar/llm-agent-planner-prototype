import { Inject, Injectable } from '@nestjs/common';

import type { LlmGateway } from '../llm/llm-gateway.interface';
import type {
  Planner,
  PlannerDecision,
  PlannerInput,
} from './planner.interface';

import { LLM_GATEWAY } from '../llm/llm.constants';

@Injectable()
export class LlmPlanner implements Planner {
  constructor(
    @Inject(LLM_GATEWAY)
    private readonly llmGateway: LlmGateway,
  ) {}

  async decide(input: PlannerInput): Promise<PlannerDecision> {
    const response = await this.llmGateway.generateAnswer({
      messages: input.messages,
      system: input.systemPrompt,
      tools: input.tools,
    });

    if (response.type === 'final_answer') {
      return {
        content: response.content,
        type: 'final_answer',
      };
    }

    return {
      arguments: response.arguments,
      content: response.content,
      toolName: response.toolName,
      toolUseId: response.toolUseId,
      type: 'tool_call',
    };
  }
}
