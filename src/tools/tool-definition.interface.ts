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

export interface ToolExecutionResult {
  result: Record<string, unknown>;
  toolName: string;
}
