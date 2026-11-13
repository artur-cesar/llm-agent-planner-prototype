import type { LlmProviderFactory } from './llm-provider-factory.interface';

import { LLM_PROVIDER_ANTHROPIC, LlmProvider } from './llm.constants';

export function getLlmProvider(
  env: NodeJS.ProcessEnv = process.env,
): LlmProvider {
  const provider = env.LLM_PROVIDER ?? LLM_PROVIDER_ANTHROPIC;

  if (provider === LLM_PROVIDER_ANTHROPIC) {
    return provider;
  }

  throw new Error(
    `Unsupported LLM_PROVIDER "${provider}". Expected "anthropic".`,
  );
}

export function getLlmFactory(
  provider: LlmProvider,
  factories: LlmProviderFactory[],
): LlmProviderFactory {
  const factory = factories.find(
    (candidate) => candidate.provider === provider,
  );

  if (factory === undefined) {
    throw new Error(`No LLM factory is registered for provider "${provider}".`);
  }

  return factory;
}
