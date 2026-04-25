import type { LlmGateway } from './llm-gateway.interface';
import type { LlmProvider } from './llm.constants';

export interface LlmProviderFactory {
  readonly provider: LlmProvider;

  create(env?: NodeJS.ProcessEnv): LlmGateway;

  validate(env?: NodeJS.ProcessEnv): void;
}
