import { OrderRepository } from '../order/order.repository';
import { ToolExecutorService } from './tool-executor.service';

describe('ToolExecutorService', () => {
  let service: ToolExecutorService;

  beforeEach(() => {
    service = new ToolExecutorService(new OrderRepository());
    service.setRuntimeConfig({
      baseDelayMs: 0,
      defaultTimeoutMs: 20,
      maxAttempts: 2,
    });
  });

  it('should return a structured success result', async () => {
    const result = await service.execute('getOrderStatus', { orderId: '123' });

    expect(result).toMatchObject({
      arguments: { orderId: '123' },
      attempt: 1,
      data: { orderId: '123', status: 'PAID' },
      success: true,
      toolName: 'getOrderStatus',
      type: 'tool_success',
    });
    expect(result.durationMs).toEqual(expect.any(Number));
  });

  it('should return a structured invalid argument error', async () => {
    await expect(service.execute('getOrderStatus', {})).resolves.toEqual({
      arguments: {},
      attempt: 1,
      durationMs: 0,
      message: 'Tool input "orderId" is required.',
      reason: 'INVALID_ARGUMENTS',
      retryable: false,
      success: false,
      toolName: 'getOrderStatus',
      type: 'tool_error',
    });
  });

  it('should return a structured tool not found error', async () => {
    await expect(
      service.execute('unsupportedTool', { orderId: '123' }),
    ).resolves.toEqual({
      arguments: { orderId: '123' },
      attempt: 1,
      durationMs: 0,
      message: 'Unsupported tool: unsupportedTool',
      reason: 'TOOL_NOT_FOUND',
      retryable: false,
      success: false,
      toolName: 'unsupportedTool',
      type: 'tool_error',
    });
  });

  it('should return a timeout error when the tool exceeds the timeout budget', async () => {
    service.setRuntimeConfig({
      defaultTimeoutMs: 5,
      maxAttempts: 1,
    });
    service.setToolBehavior('getOrderItems', {
      delayMs: 10,
    });

    const result = await service.execute('getOrderItems', { orderId: '123' });

    expect(result).toMatchObject({
      arguments: { orderId: '123' },
      attempt: 1,
      message: 'Tool execution timed out.',
      reason: 'TIMEOUT',
      retryable: true,
      success: false,
      toolName: 'getOrderItems',
      type: 'tool_error',
    });
    expect(result.durationMs).toEqual(expect.any(Number));
  });

  it('should retry retryable failures and succeed on a later attempt', async () => {
    service.setToolBehavior('getOrderItems', {
      failures: [
        {
          message: 'Temporary outage.',
          reason: 'EXECUTION_ERROR',
          retryable: true,
        },
      ],
    });

    const result = await service.execute('getOrderItems', { orderId: '123' });

    expect(result).toMatchObject({
      arguments: { orderId: '123' },
      attempt: 2,
      data: {
        found: true,
        items: ['Keyboard', 'Mouse'],
        orderId: '123',
      },
      success: true,
      toolName: 'getOrderItems',
      type: 'tool_success',
    });
    expect(result.durationMs).toEqual(expect.any(Number));
  });

  it('should not retry non-retryable failures', async () => {
    service.setToolBehavior('getOrderStatus', {
      failures: [
        {
          message: 'Bad input.',
          reason: 'INVALID_ARGUMENTS',
          retryable: false,
        },
      ],
    });

    const result = await service.execute('getOrderStatus', { orderId: '123' });

    expect(result).toMatchObject({
      arguments: { orderId: '123' },
      attempt: 1,
      message: 'Bad input.',
      reason: 'INVALID_ARGUMENTS',
      retryable: false,
      success: false,
      toolName: 'getOrderStatus',
      type: 'tool_error',
    });
    expect(result.durationMs).toEqual(expect.any(Number));
  });

  it('should return the final retryable error when retries are exhausted', async () => {
    service.setToolBehavior('getOrderItems', {
      failures: [
        {
          message: 'Temporary outage.',
          reason: 'EXECUTION_ERROR',
          retryable: true,
        },
        {
          message: 'Temporary outage again.',
          reason: 'EXECUTION_ERROR',
          retryable: true,
        },
      ],
    });

    const result = await service.execute('getOrderItems', { orderId: '123' });

    expect(result).toMatchObject({
      arguments: { orderId: '123' },
      attempt: 2,
      message: 'Temporary outage again.',
      reason: 'EXECUTION_ERROR',
      retryable: true,
      success: false,
      toolName: 'getOrderItems',
      type: 'tool_error',
    });
    expect(result.durationMs).toEqual(expect.any(Number));
  });
});
