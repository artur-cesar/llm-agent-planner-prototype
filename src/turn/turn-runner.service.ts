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
const DEFAULT_MAX_LLM_CALLS = 5;
const DEFAULT_MAX_TOOL_CALLS = 3;

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
  private readonly maxLlmCalls = DEFAULT_MAX_LLM_CALLS;
  private readonly maxToolCalls = DEFAULT_MAX_TOOL_CALLS;

  constructor(
    private readonly planner: LlmPlanner,
    private readonly toolExecutorService: ToolExecutorService,
  ) {}

  async run(input: TurnRunnerInput): Promise<TurnRunnerOutput> {
    const workingMessages = [...input.messages];
    const generatedMessages: TurnRunnerGeneratedMessage[] = [];
    let llmCalls = 0;
    let toolCalls = 0;

    for (let iteration = 1; iteration <= this.maxIterations; iteration += 1) {
      if (llmCalls >= this.maxLlmCalls) {
        this.logger.warn(
          `turn:max_llm_calls_reached limit=${this.maxLlmCalls} iteration=${iteration}`,
        );

        throw new InternalServerErrorException(
          `Planner exceeded the max LLM call limit (${this.maxLlmCalls}) for the current turn.`,
        );
      }

      llmCalls += 1;

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

        this.logger.log(
          `turn:completed outcome=final_answer iterations=${iteration} llmCalls=${llmCalls} toolCalls=${toolCalls}`,
        );

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

      if (toolCalls >= this.maxToolCalls) {
        this.logger.warn(
          `turn:max_tool_calls_reached limit=${this.maxToolCalls} iteration=${iteration}`,
        );

        throw new InternalServerErrorException(
          `Planner exceeded the max tool call limit (${this.maxToolCalls}) for the current turn.`,
        );
      }

      toolCalls += 1;

      this.logger.log(
        `turn:tool_execution_start iteration=${iteration} toolName=${decision.toolName} attempt=1`,
      );

      const executionResult = await this.toolExecutorService.execute(
        decision.toolName,
        decision.arguments,
      );

      if (executionResult.success) {
        this.logger.log(
          `turn:tool_execution_success iteration=${iteration} toolName=${executionResult.toolName} attempt=${executionResult.attempt} durationMs=${executionResult.durationMs}`,
        );
      } else {
        this.logger.warn(
          `turn:tool_execution_failure iteration=${iteration} toolName=${executionResult.toolName} attempt=${executionResult.attempt} durationMs=${executionResult.durationMs} reason=${executionResult.reason}`,
        );
      }

      const toolResultMessage: TurnRunnerGeneratedMessage = {
        content: JSON.stringify(executionResult),
        metadata: {
          arguments: decision.arguments,
          result: executionResult,
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
