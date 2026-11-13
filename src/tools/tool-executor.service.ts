import { Injectable, Logger } from '@nestjs/common';

import type { ToolDefinition } from './tool-definition.interface';
import type { RegisteredTool } from './tool-registry';

import {
  ToolExecutionErrorReason,
  ToolExecutionErrorResult,
  ToolExecutionResult,
} from './tool-definition.interface';
import { ToolExecutionFailure } from './tool-execution-failure';
import { ToolRegistry } from './tool-registry';

const DEFAULT_BASE_DELAY_MS = 100;
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_TIMEOUT_MS = 2000;

type ToolExecutorRuntimeConfig = {
  baseDelayMs: number;
  defaultTimeoutMs: number;
  maxAttempts: number;
};

@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);

  private runtimeConfig: ToolExecutorRuntimeConfig = {
    baseDelayMs: DEFAULT_BASE_DELAY_MS,
    defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
  };

  constructor(private readonly registry: ToolRegistry) {}

  async execute(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const normalizedArguments = this.normalizeArguments(input);
    const tool = this.registry.find(toolName);
    if (tool === undefined) {
      return this.createErrorResult({
        arguments: normalizedArguments,
        attempt: 1,
        durationMs: 0,
        message: `Unsupported tool: ${toolName}`,
        reason: 'TOOL_NOT_FOUND',
        retryable: false,
        toolName,
      });
    }
    const validatedArguments = this.validateArguments(
      normalizedArguments,
      tool.definition,
    );
    if (typeof validatedArguments === 'string') {
      return this.createErrorResult({
        arguments: normalizedArguments,
        attempt: 1,
        durationMs: 0,
        message: validatedArguments,
        reason: 'INVALID_ARGUMENTS',
        retryable: false,
        toolName,
      });
    }

    const maxAttempts = Math.max(1, this.runtimeConfig.maxAttempts);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      this.logger.log(
        `tool:attempt_start toolName=${toolName} attempt=${attempt} timeoutMs=${this.runtimeConfig.defaultTimeoutMs}`,
      );

      const startedAt = Date.now();

      try {
        const data = await this.executeWithTimeout(tool, validatedArguments);
        const durationMs = Date.now() - startedAt;

        this.logger.log(
          `tool:attempt_success toolName=${toolName} attempt=${attempt} durationMs=${durationMs}`,
        );

        return {
          arguments: normalizedArguments,
          attempt,
          data,
          durationMs,
          success: true,
          toolName,
          type: 'tool_success',
        };
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        const normalizedError = this.normalizeError(
          error,
          toolName,
          normalizedArguments,
          attempt,
          durationMs,
        );

        if (normalizedError.reason === 'TIMEOUT') {
          this.logger.warn(
            `tool:timeout toolName=${toolName} attempt=${attempt} durationMs=${durationMs}`,
          );
        }

        this.logger.warn(
          `tool:attempt_failure toolName=${toolName} attempt=${attempt} reason=${normalizedError.reason} retryable=${normalizedError.retryable} durationMs=${durationMs}`,
        );

        if (!normalizedError.retryable || attempt >= maxAttempts) {
          return normalizedError;
        }

        const retryDelayMs = this.runtimeConfig.baseDelayMs * attempt;

        this.logger.warn(
          `tool:retry_scheduled toolName=${toolName} attempt=${attempt} nextAttempt=${attempt + 1} delayMs=${retryDelayMs}`,
        );

        await this.sleep(retryDelayMs);
      }
    }

    return this.createErrorResult({
      arguments: normalizedArguments,
      attempt: maxAttempts,
      durationMs: 0,
      message: `Tool ${toolName} failed after ${maxAttempts} attempts.`,
      reason: 'EXECUTION_ERROR',
      retryable: false,
      toolName,
    });
  }

  setRuntimeConfig(config: Partial<ToolExecutorRuntimeConfig>): void {
    this.runtimeConfig = {
      ...this.runtimeConfig,
      ...config,
    };
  }

  resetRuntimeConfig(): void {
    this.runtimeConfig = {
      baseDelayMs: DEFAULT_BASE_DELAY_MS,
      defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
    };
  }

  private async executeWithTimeout(
    tool: RegisteredTool,
    input: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new ToolExecutionFailure(
            'TIMEOUT',
            'Tool execution timed out.',
            true,
          ),
        );
      }, this.runtimeConfig.defaultTimeoutMs);
    });

    try {
      return await Promise.race([tool.execute(input), timeoutPromise]);
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private normalizeArguments(
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    return { ...input };
  }

  private validateArguments(
    input: Record<string, unknown>,
    definition: ToolDefinition,
  ): Record<string, string> | string {
    for (const name of definition.inputSchema.required) {
      if (typeof input[name] !== 'string' || input[name].trim() === '') {
        return `Tool input "${name}" is required.`;
      }
    }
    const validated: Record<string, string> = {};
    for (const [name, value] of Object.entries(input)) {
      if (!Object.hasOwn(definition.inputSchema.properties, name)) {
        return `Unexpected tool input "${name}".`;
      }
      if (typeof value !== 'string' || value.trim() === '') {
        return `Tool input "${name}" must be a non-empty string.`;
      }
      validated[name] = value;
    }
    return validated;
  }

  private normalizeError(
    error: unknown,
    toolName: string,
    input: Record<string, unknown>,
    attempt: number,
    durationMs: number,
  ): ToolExecutionErrorResult {
    if (error instanceof ToolExecutionFailure) {
      return this.createErrorResult({
        arguments: input,
        attempt,
        durationMs,
        message: error.message,
        reason: error.reason,
        retryable: error.retryable,
        toolName,
      });
    }

    return this.createErrorResult({
      arguments: input,
      attempt,
      durationMs,
      message: 'Tool execution failed unexpectedly.',
      reason: 'EXECUTION_ERROR',
      retryable: true,
      toolName,
    });
  }

  private createErrorResult(input: {
    arguments: Record<string, unknown>;
    attempt: number;
    durationMs: number;
    message: string;
    reason: ToolExecutionErrorReason;
    retryable: boolean;
    toolName: string;
  }): ToolExecutionErrorResult {
    return {
      arguments: input.arguments,
      attempt: input.attempt,
      durationMs: input.durationMs,
      message: input.message,
      reason: input.reason,
      retryable: input.retryable,
      success: false,
      toolName: input.toolName,
      type: 'tool_error',
    };
  }

  private sleep(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
}
