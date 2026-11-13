export interface ToolInputSchemaProperty {
  description: string;
  type: 'string';
}

export interface ToolInputSchema {
  additionalProperties: false;
  properties: Record<string, ToolInputSchemaProperty>;
  required: string[];
  type: 'object';
}

export interface ToolDefinition {
  description: string;
  inputSchema: ToolInputSchema;
  name: string;
}

export type ToolExecutionErrorReason =
  | 'EXECUTION_ERROR'
  | 'INVALID_ARGUMENTS'
  | 'TIMEOUT'
  | 'TOOL_NOT_FOUND';

export interface ToolExecutionSuccessResult {
  arguments: Record<string, unknown>;
  attempt: number;
  data: Record<string, unknown>;
  durationMs: number;
  success: true;
  toolName: string;
  type: 'tool_success';
}

export interface ToolExecutionErrorResult {
  arguments: Record<string, unknown>;
  attempt: number;
  durationMs: number;
  message: string;
  reason: ToolExecutionErrorReason;
  retryable: boolean;
  success: false;
  toolName: string;
  type: 'tool_error';
}

export type ToolExecutionResult =
  | ToolExecutionSuccessResult
  | ToolExecutionErrorResult;
