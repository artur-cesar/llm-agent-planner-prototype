import { Injectable, Logger } from '@nestjs/common';

import { OrderRepository } from '../order/order.repository';
import {
  ToolExecutionErrorReason,
  ToolExecutionResult,
} from './tool-definition.interface';

const DEFAULT_BASE_DELAY_MS = 100;
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_TIMEOUT_MS = 2000;

type MockToolFailure = {
  message: string;
  reason: ToolExecutionErrorReason;
  retryable: boolean;
};

type MockToolBehavior = {
  delayMs?: number;
  failures?: MockToolFailure[];
};

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

  private readonly toolBehaviors = new Map<string, MockToolBehavior>();

  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    const normalizedArguments = this.normalizeArguments(input);
    const orderId = this.getOrderId(normalizedArguments);

    if (orderId === null) {
      return this.createErrorResult({
        arguments: normalizedArguments,
        attempt: 1,
        durationMs: 0,
        message: 'Tool input "orderId" is required.',
        reason: 'INVALID_ARGUMENTS',
        retryable: false,
        toolName,
      });
    }

    if (!this.isSupportedTool(toolName)) {
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

    const maxAttempts = Math.max(1, this.runtimeConfig.maxAttempts);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      this.logger.log(
        `tool:attempt_start toolName=${toolName} attempt=${attempt} timeoutMs=${this.runtimeConfig.defaultTimeoutMs}`,
      );

      const startedAt = Date.now();

      try {
        const data = await this.executeWithTimeout(toolName, orderId);
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

  setToolBehavior(toolName: string, behavior: MockToolBehavior): void {
    this.toolBehaviors.set(toolName, {
      delayMs: behavior.delayMs,
      failures: behavior.failures?.map((failure) => ({ ...failure })) ?? [],
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
    this.toolBehaviors.clear();
  }

  private async executeWithTimeout(
    toolName: string,
    orderId: string,
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
      return await Promise.race([
        this.invokeTool(toolName, orderId),
        timeoutPromise,
      ]);
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private async invokeTool(
    toolName: string,
    orderId: string,
  ): Promise<Record<string, unknown>> {
    const behavior = this.toolBehaviors.get(toolName);

    if ((behavior?.delayMs ?? 0) > 0) {
      await this.sleep(behavior?.delayMs ?? 0);
    }

    const plannedFailure = behavior?.failures?.shift();

    if (plannedFailure !== undefined) {
      throw new ToolExecutionFailure(
        plannedFailure.reason,
        plannedFailure.message,
        plannedFailure.retryable,
      );
    }

    switch (toolName) {
      case 'getOrderStatus':
        return this.orderRepository.getOrderStatus(orderId);
      case 'getOrderItems':
        return this.orderRepository.getOrderItems(orderId);
      default:
        throw new ToolExecutionFailure(
          'TOOL_NOT_FOUND',
          `Unsupported tool: ${toolName}`,
          false,
        );
    }
  }

  private normalizeArguments(
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    return { ...input };
  }

  private getOrderId(input: Record<string, unknown>): string | null {
    const orderId = input.orderId;

    if (typeof orderId !== 'string' || orderId.trim() === '') {
      return null;
    }

    return orderId;
  }

  private isSupportedTool(toolName: string): boolean {
    return toolName === 'getOrderStatus' || toolName === 'getOrderItems';
  }

  private normalizeError(
    error: unknown,
    toolName: string,
    input: Record<string, unknown>,
    attempt: number,
    durationMs: number,
  ) {
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
  }): ToolExecutionResult {
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

class ToolExecutionFailure extends Error {
  constructor(
    readonly reason: ToolExecutionErrorReason,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}
