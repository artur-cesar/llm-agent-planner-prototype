import type { LlmMessage } from '../llm/llm-gateway.interface';
import type { ToolDefinition } from '../tools/tool-definition.interface';

export interface PlannerFinalAnswerDecision {
  content: string;
  type: 'final_answer';
}

export interface PlannerToolCallDecision {
  arguments: Record<string, unknown>;
  content: string;
  toolName: string;
  toolUseId: string | null;
  type: 'tool_call';
}

export type PlannerDecision =
  | PlannerFinalAnswerDecision
  | PlannerToolCallDecision;

export interface PlannerInput {
  messages: LlmMessage[];
  systemPrompt: string;
  tools: ToolDefinition[];
}

export interface Planner {
  decide(input: PlannerInput): PlannerDecision | Promise<PlannerDecision>;
}
