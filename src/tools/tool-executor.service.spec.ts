import { OrderRepository } from '../order/order.repository';
import { ToolExecutionFailure } from './tool-execution-failure';
import { ToolExecutorService } from './tool-executor.service';
import { ToolRegistry } from './tool-registry';

describe('ToolExecutorService', () => {
  let service: ToolExecutorService;
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry(new OrderRepository());
    service = new ToolExecutorService(registry);
    service.setRuntimeConfig({
      baseDelayMs: 0,
      defaultTimeoutMs: 20,
      maxAttempts: 2,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function implementation(name: string) {
    const tool = registry.find(name);
    if (tool === undefined) throw new Error(`Missing registered tool ${name}`);
    return jest.spyOn(tool, 'execute');
  }

  it('should return a structured success result', async () => {
    expect(
      await service.execute('getOrderStatus', { orderId: '123' }),
    ).toMatchObject({
      arguments: { orderId: '123' },
      attempt: 1,
      data: { orderId: '123', status: 'PAID' },
      success: true,
      toolName: 'getOrderStatus',
      type: 'tool_success',
    });
  });

  it('should reject missing input without executing a tool', async () => {
    const execute = implementation('getOrderStatus');
    expect(await service.execute('getOrderStatus', {})).toMatchObject({
      reason: 'INVALID_ARGUMENTS',
      message: 'Tool input "orderId" is required.',
      retryable: false,
      success: false,
      attempt: 1,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    { orderId: '' },
    { orderId: '   ' },
    { orderId: 123 },
    { orderId: '123', unexpected: 'value' },
  ])(
    'should validate arguments against the registered schema (%#)',
    async (input) => {
      const execute = implementation('getOrderStatus');
      expect(await service.execute('getOrderStatus', input)).toMatchObject({
        reason: 'INVALID_ARGUMENTS',
        success: false,
        retryable: false,
      });
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it('should reject unknown tools before validating their input', async () => {
    expect(await service.execute('unsupportedTool', {})).toEqual({
      arguments: {},
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

  it('should dispatch and validate a registered tool without order-specific assumptions', async () => {
    const execute = jest.fn().mockResolvedValue({ answer: 'Found' });
    jest.spyOn(registry, 'find').mockReturnValue({
      definition: {
        name: 'lookup',
        description: 'Test lookup',
        inputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: { query: { type: 'string', description: 'Query' } },
          required: ['query'],
        },
      },
      execute,
    });
    expect(await service.execute('lookup', {})).toMatchObject({
      reason: 'INVALID_ARGUMENTS',
    });
    expect(execute).not.toHaveBeenCalled();
    expect(await service.execute('lookup', { query: 'example' })).toMatchObject(
      { success: true, toolName: 'lookup', data: { answer: 'Found' } },
    );
    expect(execute).toHaveBeenCalledWith({ query: 'example' });
  });

  it('should time out without cancelling the underlying operation', async () => {
    jest.useFakeTimers();
    service.setRuntimeConfig({ defaultTimeoutMs: 5, maxAttempts: 1 });
    let completed = false;
    implementation('getOrderItems').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            completed = true;
            resolve({ items: [] });
          }, 50);
        }),
    );
    const pending = service.execute('getOrderItems', { orderId: '123' });
    await jest.advanceTimersByTimeAsync(5);
    expect(await pending).toMatchObject({
      reason: 'TIMEOUT',
      message: 'Tool execution timed out.',
      retryable: true,
      success: false,
      attempt: 1,
    });
    expect(completed).toBe(false);
    await jest.advanceTimersByTimeAsync(45);
    expect(completed).toBe(true);
  });

  it('should retry retryable failures and succeed on a later attempt', async () => {
    const execute = implementation('getOrderItems').mockImplementationOnce(
      () => {
        throw new ToolExecutionFailure(
          'EXECUTION_ERROR',
          'Temporary outage.',
          true,
        );
      },
    );
    expect(
      await service.execute('getOrderItems', { orderId: '123' }),
    ).toMatchObject({
      attempt: 2,
      data: { found: true, items: ['Keyboard', 'Mouse'], orderId: '123' },
      success: true,
      type: 'tool_success',
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('should not retry non-retryable failures', async () => {
    const execute = implementation('getOrderStatus').mockImplementation(() => {
      throw new ToolExecutionFailure('INVALID_ARGUMENTS', 'Bad input.', false);
    });
    expect(
      await service.execute('getOrderStatus', { orderId: '123' }),
    ).toMatchObject({
      attempt: 1,
      message: 'Bad input.',
      reason: 'INVALID_ARGUMENTS',
      retryable: false,
      success: false,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('should return the last failure after exhausting retries', async () => {
    const execute = implementation('getOrderItems')
      .mockRejectedValueOnce(
        new ToolExecutionFailure('EXECUTION_ERROR', 'Temporary outage.', true),
      )
      .mockRejectedValueOnce(
        new ToolExecutionFailure(
          'EXECUTION_ERROR',
          'Temporary outage again.',
          true,
        ),
      );
    expect(
      await service.execute('getOrderItems', { orderId: '123' }),
    ).toMatchObject({
      attempt: 2,
      message: 'Temporary outage again.',
      reason: 'EXECUTION_ERROR',
      retryable: true,
      success: false,
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('should normalize unexpected failures without exposing their internal message', async () => {
    const execute = implementation('getOrderItems').mockImplementation(() => {
      throw new Error('Internal detail');
    });
    expect(
      await service.execute('getOrderItems', { orderId: '123' }),
    ).toMatchObject({
      reason: 'EXECUTION_ERROR',
      attempt: 2,
      message: 'Tool execution failed unexpectedly.',
      success: false,
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
