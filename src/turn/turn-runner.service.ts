import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import type { LlmMessage } from '../llm/llm-gateway.interface';
import type { ToolDefinition } from '../tools/tool-definition.interface';

import { LlmPlanner } from '../planner/llm-planner';
import { ToolExecutorService } from '../tools/tool-executor.service';

const DEFAULT_MAX_ITERATIONS = 5;

export interface TurnRunnerGeneratedMessage extends LlmMessage {
  metadata?: Record<string, unknown> | null;
}

export interface TurnRunnerInput {
  messages: LlmMessage[];
  systemPrompt: string;
  tools: ToolDefinition[];
}

export interface TurnRunnerOutput {
  content: string;
  generatedMessages: TurnRunnerGeneratedMessage[];
}

@Injectable()
export class TurnRunnerService {
  private readonly logger = new Logger(TurnRunnerService.name);

  private readonly maxIterations = DEFAULT_MAX_ITERATIONS;

  constructor(
    private readonly planner: LlmPlanner,
    private readonly toolExecutorService: ToolExecutorService,
  ) {}

  async run(input: TurnRunnerInput): Promise<TurnRunnerOutput> {
    const workingMessages = [...input.messages];
    const generatedMessages: TurnRunnerGeneratedMessage[] = [];

    for (let iteration = 1; iteration <= this.maxIterations; iteration += 1) {
      const decision = await this.planner.decide({
        messages: workingMessages,
        systemPrompt: input.systemPrompt,
        tools: input.tools,
      });

      this.logger.log(
        `turn:planner_decision iteration=${iteration} type=${decision.type}${
          decision.type === 'tool_call' ? ` toolName=${decision.toolName}` : ''
        }`,
      );

      if (decision.type === 'final_answer') {
        const finalAnswerMessage: TurnRunnerGeneratedMessage = {
          content: decision.content,
          role: 'assistant',
        };

        generatedMessages.push(finalAnswerMessage);

        return {
          content: decision.content,
          generatedMessages,
        };
      }

      const assistantToolCallMessage: TurnRunnerGeneratedMessage = {
        arguments: decision.arguments,
        content: decision.content,
        metadata: {
          arguments: decision.arguments,
          toolName: decision.toolName,
          toolUseId: decision.toolUseId,
        },
        role: 'assistant',
        toolName: decision.toolName,
        toolUseId: decision.toolUseId,
      };

      workingMessages.push(assistantToolCallMessage);
      generatedMessages.push(assistantToolCallMessage);

      const executionResult = this.toolExecutorService.execute(
        decision.toolName,
        decision.arguments,
      );

      this.logger.log(
        `turn:tool_executed iteration=${iteration} toolName=${executionResult.toolName}`,
      );

      const toolResultMessage: TurnRunnerGeneratedMessage = {
        content: JSON.stringify(executionResult.result),
        metadata: {
          result: executionResult.result,
          toolName: executionResult.toolName,
          toolUseId: decision.toolUseId,
        },
        role: 'tool',
        toolName: executionResult.toolName,
        toolUseId: decision.toolUseId,
      };

      workingMessages.push(toolResultMessage);
      generatedMessages.push(toolResultMessage);
    }

    this.logger.warn(
      `turn:max_iterations_reached limit=${this.maxIterations} without final_answer`,
    );

    throw new InternalServerErrorException(
      `Planner reached the max iteration limit (${this.maxIterations}) without a final answer.`,
    );
  }
}
