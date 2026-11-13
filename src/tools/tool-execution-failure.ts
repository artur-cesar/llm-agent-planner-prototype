import type { ToolExecutionErrorReason } from './tool-definition.interface';

export class ToolExecutionFailure extends Error {
  constructor(
    readonly reason: ToolExecutionErrorReason,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}
